# Client message — buying and setting up a domain

Reusable. Swap `[NAME]`, `[DOMAIN]` and the suggestions, then send.
Notes for Billy are at the bottom — don't send those.

---

## The message

Hi [NAME],

Before we can put your site live you'll need to own your web address —
your domain. It's yours, not mine, and it stays yours. Here's everything
you need to know, in plain English.

**What it costs**

A domain is about **£10–15 a year**. That's it. It's a yearly rental on
the name, nothing more.

**What to buy**

I'd suggest, in order:

1. **[DOMAIN].co.uk**
2. **[DOMAIN].com**

A few rules that save trouble later:

- Short and easy to say out loud. If you have to spell it over the phone,
  it's the wrong one.
- No hyphens and no numbers-that-sound-like-words. `smith-and-sons` gets
  typed as `smithandsons` every time.
- `.co.uk` is perfect if your customers are British — it actually helps
  you show up in UK searches.
- If both `.co.uk` and `.com` are free and cheap, buy both and point the
  spare at the main one. It stops someone else taking your name later.

**Where to buy it**

Any of these are fine — GoDaddy, Namecheap, 123-Reg. If you have no
preference I'd use **Cloudflare Registrar**, because they sell domains at
cost with no markup and no upsells, and it's where your site will be
hosted anyway.

**What NOT to buy**

This is the important bit. The checkout will try hard to sell you things.
Say no to all of it:

| They'll offer | Say |
|---|---|
| Web hosting / website builder | **No** — your site is already hosted |
| Email hosting | **Not yet** — talk to me first, there's a better option |
| SSL certificate | **No** — yours is free and automatic |
| "Domain privacy" at £8/year | **No** — free where you're buying, and required by law to be free for .co.uk |
| SEO or marketing packages | **No** |
| Extra endings (.net, .biz, .info…) | **No** |

You should be paying for the domain and nothing else. If your basket is
over about £20, something's been added — take it out.

**Two things to watch**

- **The renewal price.** Some sellers charge £1 for the first year and
  £30 to renew. Check the renewal price before you pay, not the offer
  price.
- **Turn auto-renew ON.** If a domain lapses, anyone can buy it, and
  getting it back is expensive or impossible. This is the single most
  common way small businesses lose their website.

**Use your own details**

Register it in **your name and your business's**, with an email address
you'll still have in five years. Don't let anyone — including me —
register it for you in their name. If you ever want to move to another
web person, owning the domain yourself is what makes that easy.

**When it's bought**

Send me a message saying it's done and I'll tell you the one setting to
change — it takes about two minutes and I'll walk you through it, or you
can add me to the account and I'll do it. Your site can be live the same
day.

Any questions at all, just ask. There are no silly ones with this stuff.

[YOUR NAME]

---

## Notes for Billy — don't send

**Why the "no email hosting" line.** Cloudflare can't host mailboxes. If
they want `hello@theirdomain`, that's 20i or Google Workspace, added as
MX records afterwards. Don't let them buy the registrar's email bundle on
day one — it's usually overpriced and it complicates the DNS move.

**What you actually need from them after purchase.** One of:

1. **Nameserver change** (preferred) — they add the domain to Cloudflare,
   Cloudflare gives two nameservers, they paste them into the registrar.
   Two minutes. You get full control and it's free.
2. **Account access** — they add you as a user, or you screen-share it.
   Faster with less confident clients, but you're now holding a login for
   an asset that isn't yours. Get the nameserver change instead if you can.

**Never register it yourself in your own name.** It reads as convenient
and ends as a hostage situation the day they want to leave. Owning their
own domain is also a genuine selling point against agencies that don't
allow it — say so.

**If they already own it** (Himansu does), skip straight to the
nameserver step in `docs/mumbai2london-golive.md`, and check their
existing email records come across before you switch.

**The renewal trap is worth chasing.** Diary their renewal date. A client
whose domain expires blames the web person, every time.
