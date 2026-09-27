/* A small DNS client that really does ask the server you name.

   Why this exists. megacity-dns-check.mjs used node:dns's Resolver.setServers()
   to check a zone on a nameserver of your choosing — the whole point being to
   see Cloudflare's copy of the zone answering correctly BEFORE the nameservers
   move, while the live domain is still untouched. In the container this was
   first run in, those queries never reached the server named: something local
   answered every one of them recursively. The proof was asking
   aaron.ns.cloudflare.com about bbc.co.uk and getting a real answer, when a
   nameserver that is only authoritative must refuse a zone it does not serve.

   Every run therefore "passed", because it was reading public DNS — which is
   still GoDaddy's zone — and calling it Cloudflare's. A check that cannot fail
   is worse than no check, so this builds the query itself, sends it over UDP to
   the address given, and reads the reply, including the header's AA bit.

   Exports queryRaw() for one lookup and isAuthoritative() for the precondition
   the checker refuses to run without. */

import dgram from "node:dgram";

const TYPE = { A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28, SRV: 33 };
const RCODE = { 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED" };

function encodeName(name) {
  const out = [];
  for (const label of name.replace(/\.$/, "").split(".")) {
    if (!label.length) continue;
    if (label.length > 63) throw new Error("label too long: " + label);
    out.push(Buffer.from([label.length]), Buffer.from(label, "ascii"));
  }
  out.push(Buffer.from([0]));
  return Buffer.concat(out);
}

/* Names in answers may be compressed: a pointer back into the message. */
function readName(buf, off) {
  const parts = [];
  let jumped = false, end = off, guard = 0;
  for (;;) {
    if (guard++ > 128) throw new Error("compression loop");
    const len = buf[off];
    if (len === undefined) throw new Error("truncated name");
    if (len === 0) { off += 1; if (!jumped) end = off; break; }
    if ((len & 0xc0) === 0xc0) {
      const ptr = ((len & 0x3f) << 8) | buf[off + 1];
      if (!jumped) end = off + 2;
      jumped = true; off = ptr; continue;
    }
    parts.push(buf.toString("ascii", off + 1, off + 1 + len));
    off += 1 + len;
    if (!jumped) end = off;
  }
  return { name: parts.join("."), off: end };
}

function readRdata(buf, type, off, len) {
  const end = off + len;
  switch (type) {
    case TYPE.A: return Array.from(buf.subarray(off, off + 4)).join(".");
    case TYPE.AAAA: {
      const g = []; for (let i = 0; i < 16; i += 2) g.push(buf.readUInt16BE(off + i).toString(16));
      return g.join(":");
    }
    case TYPE.NS: case TYPE.CNAME: return readName(buf, off).name;
    case TYPE.MX: { const pref = buf.readUInt16BE(off); return `${pref} ${readName(buf, off + 2).name}`; }
    case TYPE.SRV: {
      const [pr, w, port] = [buf.readUInt16BE(off), buf.readUInt16BE(off + 2), buf.readUInt16BE(off + 4)];
      return `${pr} ${w} ${port} ${readName(buf, off + 6).name}`;
    }
    case TYPE.TXT: {
      const chunks = []; let p = off;
      while (p < end) { const l = buf[p]; chunks.push(buf.toString("utf8", p + 1, p + 1 + l)); p += 1 + l; }
      return chunks.join("");
    }
    case TYPE.SOA: return readName(buf, off).name;
    default: return buf.toString("hex", off, end);
  }
}

/* One query, straight at `server`. recursion:false means the reply can only be
   what that server itself knows — which is what makes the AA bit meaningful. */
export function queryRaw(name, type, server, { timeout = 6000, recursion = false } = {}) {
  const qtype = TYPE[type];
  if (!qtype) throw new Error("unsupported type " + type);
  const id = Math.floor(Math.random() * 65535);
  const header = Buffer.alloc(12);
  header.writeUInt16BE(id, 0);
  header.writeUInt16BE(recursion ? 0x0100 : 0x0000, 2);
  header.writeUInt16BE(1, 4);
  const question = Buffer.concat([encodeName(name), Buffer.from([qtype >> 8, qtype & 0xff, 0x00, 0x01])]);
  const msg = Buffer.concat([header, question]);

  return new Promise((resolve) => {
    const sock = dgram.createSocket("udp4");
    const done = (v) => { clearTimeout(timer); try { sock.close(); } catch {} resolve(v); };
    const timer = setTimeout(() => done({ ok: false, reason: "timeout", values: [] }), timeout);
    sock.on("error", (e) => done({ ok: false, reason: e.code || String(e), values: [] }));
    sock.on("message", (buf) => {
      try {
        if (buf.readUInt16BE(0) !== id) return;                 /* not our reply */
        const flags = buf.readUInt16BE(2);
        const rcode = flags & 0x0f;
        const aa = (flags >> 10) & 1;
        const tc = (flags >> 9) & 1;
        const counts = { an: buf.readUInt16BE(6), ns: buf.readUInt16BE(8) };
        let off = 12;
        for (let i = 0; i < buf.readUInt16BE(4); i++) { off = readName(buf, off).off + 4; }
        const values = [];
        for (let i = 0; i < counts.an; i++) {
          const r = readName(buf, off); off = r.off;
          const rtype = buf.readUInt16BE(off);
          const rdlen = buf.readUInt16BE(off + 8);
          const rdoff = off + 10;
          if (rtype === qtype) values.push(readRdata(buf, rtype, rdoff, rdlen));
          off = rdoff + rdlen;
        }
        done({ ok: rcode === 0, rcode, rcodeName: RCODE[rcode] || String(rcode), aa: !!aa, truncated: !!tc, values });
      } catch (e) { done({ ok: false, reason: "malformed reply: " + e.message, values: [] }); }
    });
    sock.send(msg, 53, server);
  });
}

/* The precondition. A server that is authoritative for a zone answers queries
   for it with AA set; a server that is not must refuse (or at least must not
   claim authority). Both halves are checked, because each catches a different
   lie: the first that we reached the right server, the second that we reached
   an authoritative server at all rather than a resolver standing in for one. */
export async function isAuthoritative(zone, server) {
  const mine = await queryRaw(zone, "SOA", server);
  if (mine.reason) return { ok: false, why: `no reply from ${server} (${mine.reason})` };
  if (!mine.aa) {
    return { ok: false, why: `${server} answered for ${zone} without the authoritative bit `
      + `(${mine.rcodeName}) — it is not serving this zone, or the query never reached it` };
  }
  /* A recursive resolver in the path will happily answer for a zone this server
     could not possibly be authoritative for. */
  const foreign = await queryRaw("bbc.co.uk", "NS", server);
  if (foreign.ok && foreign.values.length) {
    return { ok: false, why: `${server} also answered a query about bbc.co.uk, which it cannot be `
      + `authoritative for — something recursive is answering in its place, so nothing it says about `
      + `${zone} can be trusted` };
  }
  return { ok: true };
}
