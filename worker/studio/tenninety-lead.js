/* Putting enquiries INTO 10ninety — the Open API.
 *
 * Separate product from the Web API in tenninety.js, separate host, separate
 * header, separate key. That one reads the properties on the market; this one
 * writes leads and maintenance reports.
 *
 *   POST /OpenAPILead/Register              a landlord, tenant, vendor or buyer
 *   POST /OpenAPIMaintenanceIssue/Report    a repair
 *
 * WHY THIS IS NOT ALLOWED TO FAIL LOUDLY
 *
 * A registration is somebody typing their name and phone number into a
 * letting agent's website. If 10ninety is slow, or the key has expired, or
 * support has not enabled the alert yet, the person filling the form must not
 * find out — they have done nothing wrong and there is nothing for them to do
 * about it.
 *
 * So for leads the email is the reliable path and this is the improvement on
 * top: the enquiry is emailed first, the post to 10ninety happens after the
 * visitor has been thanked, and a failure here is logged rather than shown.
 * Worst case the office re-keys one enquiry, which is what they do for all of
 * them today.
 *
 * Repairs are the other way round (worker.js, handleMegacityMaintenance):
 * 10ninety emails its own alert when a report lands in it, so the report goes
 * to 10ninety first and the website only emails management@ itself when
 * 10ninety did not confirm it — one email per repair, never none.
 */

const LEAD_PATH = "/OpenAPILead/Register";
const MAINTENANCE_PATH = "/OpenAPIMaintenanceIssue/Report";
const AUTH_HEADER = "10ninety.OpenApi.Key";
const TIMEOUT_MS = 8000;

/* ContactRoleType is theirs and closed: Landlord, Tenant, Vendor, Buyer.
   Our forms are named after what the visitor was doing, so this is the map
   between the two vocabularies, in one place. A form with no sensible role
   does not become a lead at all rather than becoming the wrong kind. */
export const ROLE_FOR = {
  landlord: "Landlord",        /* landlord registration */
  valuation: "Landlord",       /* a valuation request is a landlord enquiry */
  register: "Tenant",          /* tenant registration */
  viewing: "Tenant",
  application: "Tenant",
  tour: "Tenant",
  "contact-tenant": "Tenant",
  "contact-landlord": "Landlord",
  /* contact and maintenance are deliberately absent: a general contact form
     has no role until someone reads it, and a repair is not a lead — it goes
     to the maintenance endpoint below instead. */
};

/* The forms that are about one particular home. For these the lead names the
   home in words as well as by reference: a reference only helps if it matches
   one in his system, and the words always do. (The contact form puts its topic
   in the same "property" field, so it is not on this list.) */
const ABOUT_A_HOME = new Set(["viewing", "application", "tour"]);

const clip = (v, n) => (v === null || v === undefined ? undefined : String(v).trim().slice(0, n) || undefined);

/* "Jane Smith" -> first and last. Their API takes either a split name or a
   whole one and says it will "attempt to split" — but our forms ask for one
   name box, and a split we do ourselves is one we can see. */
export function splitName(full) {
  const parts = String(full || "").trim().replace(/\s+/g, " ").split(" ");
  if (!parts[0]) return {};
  if (parts.length === 1) return { Surname: clip(parts[0], 100) };
  return { Firstname: clip(parts[0], 100), Surname: clip(parts.slice(1).join(" "), 100) };
}

/* ── building the request ────────────────────────────────────────────────── */

/* Pure, so the shape can be tested without posting anything to a client's
   live system. Returns null when there is nothing worth sending. */
export function leadBody(e) {
  const role = ROLE_FOR[e.kind];
  if (!role) return null;
  /* Their rule: one of Firstname, Surname or CompanyName is required.
     Both registration forms now ask for first name and surname separately, as
     his 10ninety forms did, so those are used as given. Splitting a joined
     name back apart gets "Mary Anne Smith" wrong, and there is no reason to
     guess at something the visitor has already said. */
  const given = { ...(clip(e.firstName, 100) ? { Firstname: clip(e.firstName, 100) } : {}),
                  ...(clip(e.surname, 100) ? { Surname: clip(e.surname, 100) } : {}) };
  const name = Object.keys(given).length ? given : splitName(e.name);
  if (!name.Firstname && !name.Surname && !e.company) return null;
  /* And a lead nobody can reply to is not a lead. */
  const email = clip(e.email, 255);
  const phone = clip(e.phone, 50);
  if (!email && !phone) return null;

  const body = {
    ContactRoleType: role,
    ...name,
    ...(e.company ? { CompanyName: clip(e.company, 160) } : {}),
    ...(email ? { Email: email } : {}),
    ...(phone ? { MobilePhoneNumber: phone } : {}),
  };

  const addr = {
    ...(clip(e.address1, 160) ? { Address1: clip(e.address1, 160) } : {}),
    ...(clip(e.town, 80) ? { Town: clip(e.town, 80) } : {}),
    ...(clip(e.postcode, 16) ? { Postcode: clip(e.postcode, 16) } : {}),
  };
  if (Object.keys(addr).length) body.Address = addr;

  /* The property they were looking at, by the agent's own reference, so the
     enquiry arrives attached to it instead of as a sentence about it. */
  if (clip(e.propertyRef, 40)) body.PropertyReference = clip(e.propertyRef, 40);
  if (Array.isArray(e.areaNames) && e.areaNames.length) body.AreaNames = e.areaNames.slice(0, 10).map((a) => clip(a, 80)).filter(Boolean);

  /* Everything the visitor actually wrote, plus where it came from. Whoever
     opens this in 10ninety should not have to go and find the website to
     understand what they are looking at. */
  const home = ABOUT_A_HOME.has(e.kind) ? clip(e.property, 200) : undefined;
  const extra = [home ? "Property: " + home : null, clip(e.message, 900), e.wants ? "Looking for: " + clip(e.wants, 300) : null,
    e.preferredDay ? "Preferred viewing: " + clip(e.preferredDay, 120) : null,
    "Submitted on megacityproperties.co.uk" + (e.formLabel ? " (" + clip(e.formLabel, 60) + ")" : "")]
    .filter(Boolean).join(" — ");
  if (extra) body.AdditionalInfo = clip(extra, 1000);

  return body;
}

export function maintenanceBody(e) {
  const name = clip(e.name, 160);
  const email = clip(e.email, 255);
  const mobile = clip(e.phone, 50);
  /* Their required set, and a report missing any of it is one the office
     cannot act on anyway. */
  if (!name || (!email && !mobile)) return null;
  const problem = clip(e.problem || e.category, 255) || "Maintenance";
  const detail = clip(e.message || e.details, 4000);
  const where = clip(e.propertyAddress || e.address1, 255);
  if (!detail || !where) return null;
  return {
    Name: name,
    ...(email ? { Email: email } : {}),
    ...(mobile ? { Mobile: mobile } : {}),
    Problem: problem,
    SubOption: clip(e.subOption, 255) || problem,
    AdditionalInformation: detail,
    PropertyAddress: where,
    ...(Array.isArray(e.imageUrls) && e.imageUrls.length ? { ImageUrls: e.imageUrls.slice(0, 10) } : {}),
  };
}

/* ── sending it ──────────────────────────────────────────────────────────── */

function baseUrl(env) {
  const key = (env && env.TENNINETY_BUSINESS_KEY) || "megacityproperties";
  return `https://${key}.10ninety.co.uk`;
}

async function post(env, path, body, opts = {}) {
  const key = env && env.TENNINETY_OPEN_API_KEY;
  if (!key) return { ok: false, why: "TENNINETY_OPEN_API_KEY is not set" };
  const fetchImpl = opts.fetch || fetch;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeout || TIMEOUT_MS);
  try {
    /* redirect "manual": when this host fails it answers with a 302 to an
       HTML error page that itself says 200. Following it would count a failed
       report as a delivered one. */
    const res = await fetchImpl(baseUrl(env) + path, {
      method: "POST", signal: ctl.signal, redirect: "manual",
      headers: { [AUTH_HEADER]: key, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = JSON.parse(text); } catch { /* their error pages are not JSON */ }
    if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
      return { ok: false, why: `redirected (HTTP ${res.status || "3xx"})`, detail: String(res.headers && res.headers.get && res.headers.get("location") || "").slice(0, 200) };
    }
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}`, detail: text.slice(0, 200) };
    /* They answer 200 with IsSuccessful:false for a rejected record, so the
       status code alone is not the answer — and a 200 that is not their JSON
       at all (a login page, an error page) is not an answer either. Callers
       treat "not ok" as "not confirmed": the worst that does is send an email
       the office also gets from 10ninety, never lose one. */
    if (!data || typeof data !== "object") return { ok: false, why: "reply was not 10ninety's JSON", detail: text.slice(0, 200) };
    if (data.IsSuccessful === false) return { ok: false, why: clip(data.ErrorMessage, 200) || "rejected" };
    return { ok: true, id: data && data.Id ? String(data.Id) : null };
  } catch (e) {
    return { ok: false, why: e && e.name === "AbortError" ? "timed out" : String(e && e.message || e).slice(0, 120) };
  } finally { clearTimeout(timer); }
}

/* Never throws. The caller has already emailed the enquiry and already told
   the visitor it went through; this only decides what gets written on the
   record afterwards. */
export async function sendLead(env, enquiry, opts = {}) {
  try {
    const body = leadBody(enquiry);
    if (!body) return { ok: false, skipped: true, why: "not a lead" };
    const r = await post(env, LEAD_PATH, body, opts);
    if (!r.ok) console.error("10ninety lead", r.why, r.detail || "");
    return r;
  } catch (e) { console.error("10ninety lead threw", e && e.message); return { ok: false, why: "threw" }; }
}

export async function sendMaintenance(env, enquiry, opts = {}) {
  try {
    const body = maintenanceBody(enquiry);
    if (!body) return { ok: false, skipped: true, why: "incomplete report" };
    const r = await post(env, MAINTENANCE_PATH, body, opts);
    if (!r.ok) console.error("10ninety maintenance", r.why, r.detail || "");
    return r;
  } catch (e) { console.error("10ninety maintenance threw", e && e.message); return { ok: false, why: "threw" }; }
}

export const _internals = { LEAD_PATH, MAINTENANCE_PATH, AUTH_HEADER, baseUrl, post };
