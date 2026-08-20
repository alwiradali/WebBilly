/* ===========================================================================
   BAKED WITH AMABILIS — content model
   ---------------------------------------------------------------------------
   Everything the page renders that isn't structural lives here. Swap a value,
   reload, done — no build step, no markup surgery.

   `demo: true` marks content invented for the build. Anything without it came
   from the studio's own price list, order guide, policy card or reels.
   =========================================================================== */
window.AMABILIS = (function () {
  "use strict";

  var IMG = "../../assets/amabilis/cakes/";
  var VID = "../../assets/amabilis/video/";
  var STK = "../../assets/amabilis/stock/";

  return {

    /* -- studio ----------------------------------------------------------- */
    studio: {
      name: "Bakedwith Amabilis",
      tagline: "with love",
      town: "Basingstoke",
      county: "Hampshire",
      handle: "bakedwithamabilis",
      instagram: "https://www.instagram.com/bakedwithamabilis/",
      tiktok: "https://www.tiktok.com/@bakedwithamabilis",
      /* Drop the supplied logo file in at this path and it is used everywhere.
         Until then the lockup below stands in — see assets/amabilis/README.md */
      logo: "../../assets/amabilis/brand/logo.png",
      /* Collection only. No delivery is offered on the studio's order card. */
      collection: "Collection from Basingstoke",
      payment: "Bank transfer, in full, before an order is made",
      notice: [
        { what: "Cakes & cupcakes", lead: "1 week" },
        { what: "Brownies & cookies", lead: "5 days" }
      ]
    },

    /* -- the cakes -------------------------------------------------------- */
    /* Stills are frames from the studio's own reels. `reel` links the clip the
       still was taken from; cards without one simply don't offer playback. */
    cakes: [
      {
        slug: "heirloom",
        name: "Heirloom",
        occasion: "Birthday",
        line: "Twenty‑three, in blush",
        note: "Heritage piping worked shell by shell — pearl beading, ribbon " +
              "swags and a hand‑lettered plaque, boxed under organza and tied " +
              "before it leaves the kitchen.",
        finish: "Vintage piped buttercream",
        serves: "12–16",
        from: 65,
        img: IMG + "heirloom.webp",
        alt: "Blush pink vintage-piped celebration cake with pearl beading and a " +
             "hand-lettered 'Twenty Three' plaque, ribbon-tied in a clear box",
        detail: IMG + "heirloom-detail.webp",
        reel: VID + "heirloom.mp4",
        reelWebm: VID + "heirloom.webm",
        poster: VID + "heirloom-poster.webp",
        tone: "blush"
      },
      {
        slug: "merlot",
        name: "Merlot",
        occasion: "Milestone",
        line: "Deep red, gold satin",
        note: "A merlot buttercream shell finished with antique gold bows, " +
              "gilded pearls and a single piped initial. Built for the birthday " +
              "that wants the room to go quiet.",
        finish: "Merlot buttercream, gold leaf pearls",
        serves: "16–20",
        from: 85,
        img: IMG + "merlot.webp",
        alt: "Deep merlot buttercream cake trimmed with antique gold satin bows " +
             "and gold pearls, with a piped monogram on the crown",
        detail: IMG + "merlot-detail.webp",
        reel: VID + "merlot.mp4",
        reelWebm: VID + "merlot.webm",
        poster: VID + "merlot-poster.webp",
        tone: "merlot"
      },
      {
        slug: "bloom",
        name: "Bloom",
        occasion: "Birthday",
        line: "Ruffled, and full of flowers",
        note: "Ribbon ruffles combed into the buttercream by hand, then a whole " +
              "crown of fresh blooms — roses, hydrangea, an orchid laid at the " +
              "base like an afterthought that took an hour.",
        finish: "Combed ruffles, fresh florals",
        serves: "16–20",
        from: 85,
        img: IMG + "bloom.webp",
        alt: "Tall blush buttercream cake with combed ribbon ruffles and a crown " +
             "of fresh pink roses, hydrangea and an orchid",
        detail: IMG + "bloom-detail.webp",
        reel: VID + "bloom.mp4",
        reelWebm: VID + "bloom.webm",
        poster: VID + "bloom-poster.webp",
        tone: "blush"
      },
      {
        slug: "midnight",
        name: "Midnight",
        occasion: "Birthday",
        line: "Portrait in aubergine",
        note: "An edible print set into an aubergine shell, ringed with piped " +
              "shells, silver pearls and mirrored spheres. Every detail cut to " +
              "the same low, late‑night key.",
        finish: "Aubergine buttercream, edible print",
        serves: "16–20",
        from: 85,
        img: IMG + "midnight.webp",
        alt: "Deep aubergine buttercream cake with an edible portrait print, " +
             "piped shell borders, silver pearls and mirrored disco spheres",
        detail: IMG + "midnight-detail.webp",
        reel: VID + "midnight.mp4",
        reelWebm: VID + "midnight.webm",
        poster: VID + "midnight-poster.webp",
        tone: "aubergine"
      },
      {
        slug: "velocity",
        name: "Velocity",
        occasion: "Children's",
        line: "Fifth birthday, top speed",
        note: "Two greens torn back over one another, a hand‑cut crest, " +
              "chequered flags and a name board at the base. Sculpted work, " +
              "made for someone who is five.",
        finish: "Two-tone buttercream, sculpted detail",
        serves: "12–16",
        from: 75,
        img: IMG + "velocity.webp",
        alt: "Two-tone green sculpted birthday cake with a Lamborghini crest, " +
             "chequered flags, a number five topper and a name board",
        detail: IMG + "velocity-detail.webp",
        reel: VID + "velocity.mp4",
        reelWebm: VID + "velocity.webm",
        poster: VID + "velocity-poster.webp",
        tone: "green"
      }
    ],

    /* Photographs the studio has sent but that aren't in the repository yet.
       Save each file at the path below, move the entry up into `cakes`, and it
       appears everywhere the others do. Nothing else needs touching. */
    awaitingPhotos: [
      { slug: "noel",     name: "Noël",     occasion: "Christmas",
        img: IMG + "noel.webp",
        note: "Coconut snow, a fondant Santa face-down in a drift, piped sleigh " +
              "and reindeer, tree and gifts at the base." },
      { slug: "macaron",  name: "Macaron",  occasion: "Celebration",
        img: IMG + "macaron.webp",
        note: "Watercolour buttercream with gold leaf, a rose drip and a crown " +
              "of macarons." },
      { slug: "blessing", name: "Blessing", occasion: "Christening",
        img: IMG + "blessing.webp",
        note: "Ivory buttercream under a cascade of silver and pearl, blue and " +
              "teal florals, glitter cross." },
      { slug: "peony",    name: "Peony",    occasion: "Birthday",
        img: IMG + "peony.webp",
        note: "Marbled blush and cream buttercream under fresh peonies, with a " +
              "gold script topper." }
    ],

    /* -- stock imagery ----------------------------------------------------
       NOT her work, and never presented as it. Free-licence photography from
       Pexels (free for commercial use, no attribution required) used for
       atmosphere and for the process steps she has no photographs of yet.
       Swap any of these for her own and the page picks them up unchanged. */
    stockIsPlaceholder: true,
    hero: {
      poster: STK + "hero-drip-poster.webp",
      mp4:    STK + "hero-drip.mp4",
      webm:   STK + "hero-drip.webm",
      credit: "Stock film — Pexels"
    },
    atmosphere: [
      { img: STK + "drip-pour.webp",   sm: STK + "drip-pour-sm.webp",
        cap: "The drip",       alt: "Chocolate ganache being poured over the edge of a pink buttercream cake" },
      { img: STK + "mix-cocoa.webp",   sm: STK + "mix-cocoa-sm.webp",
        cap: "Cocoa & flour",  alt: "Cocoa powder and flour sifted together in a glass bowl beside cracked eggs" },
      { img: STK + "pipe-kisses.webp", sm: STK + "pipe-kisses-sm.webp",
        cap: "Piped by hand",  alt: "A piping bag setting rows of pink buttercream kisses onto a cake" },
      { img: STK + "flatlay.webp",     sm: STK + "flatlay-sm.webp",
        cap: "Everything out", alt: "Baking ingredients and utensils laid out on a table before a bake" },
      { img: STK + "drip-white.webp",  sm: STK + "drip-white-sm.webp",
        cap: "The pour",       alt: "Caramel sauce being poured over the top of a white iced cake" },
      { img: STK + "pipe-hands.webp",  sm: STK + "pipe-hands-sm.webp",
        cap: "Steady hands",   alt: "Hands holding a piping bag mid-pipe" },
      { img: STK + "flour-dark.webp",  sm: STK + "flour-dark-sm.webp",
        cap: "The mix",        alt: "Flour and cocoa being stirred in a dark bowl" },
      { img: STK + "drip-dark.webp",   sm: STK + "drip-dark-sm.webp",
        cap: "Couverture",     alt: "Dark chocolate running down the side of a naked layer cake" }
    ],

    /* -- boxes: the studio's own price list ------------------------------- */
    boxes: {
      sizes: [
        { qty: 6,  price: 15 },
        { qty: 9,  price: 22 },
        { qty: 12, price: 28 },
        { qty: 18, price: 40 }
      ],
      kinds: [
        { name: "Cookie box",  flavours: ["Triple chocolate", "White chocolate",
                                          "Plain chocolate chip", "Oreo"] },
        { name: "Brownie box", flavours: ["Triple chocolate", "White chocolate",
                                          "Lotus Biscoff", "Chocolate & strawberry"] }
      ]
    },

    /* -- services --------------------------------------------------------- */
    services: [
      { name: "Birthday cakes",   note: "Single tier, sculpted, or piped to a theme.", img: IMG + "heirloom-sm.webp" },
      { name: "Celebration cakes",note: "Engagements, christenings, anniversaries, graduations.", img: IMG + "bloom-sm.webp" },
      { name: "Wedding cakes",    note: "Tiered work, tasting first, styled to the day.", img: IMG + "merlot-sm.webp" },
      { name: "Cupcakes",         note: "Piped and finished to match the cake.", img: IMG + "bloom-detail-sm.webp" },
      { name: "Brownies & cookies", note: "Boxed by the six, nine, twelve or eighteen.", img: IMG + "heirloom-detail-sm.webp" },
      { name: "Mini loaves & muffins", note: "Favours, hampers, morning tables.", img: IMG + "merlot-detail-sm.webp" },
      { name: "Dessert tables",   note: "One order, styled as a whole.", img: IMG + "midnight-sm.webp" },
      { name: "Corporate & events", note: "Branded, sculpted, or kept quiet and elegant.", img: IMG + "velocity-sm.webp" }
    ],

    /* -- pricing ---------------------------------------------------------- */
    /* DEMO FIGURES. The studio prices bespoke work on enquiry; these tiers are
       here to show the layout. Replace or delete before the site goes live. */
    pricingIsDemo: true,
    pricing: [
      { tier: "Celebration", from: 45,
        note: "A single tier, one flavour, finished simply and beautifully.",
        includes: ["6\" single tier", "One flavour", "Buttercream finish", "Name or age topper"] },
      { tier: "Signature", from: 65,
        note: "The house style — piped detail, a colour story, a plaque.",
        includes: ["6–7\" tall tier", "Two flavours", "Piped or textured finish", "Hand-lettered plaque"] },
      { tier: "Luxury bespoke", from: 85,
        note: "Sculpted detail, fresh florals, gold work, edible print.",
        includes: ["Tall or double tier", "Fresh florals or gold leaf", "Sculpted or printed detail", "Designed with you"] },
      { tier: "Wedding & event", from: 120,
        note: "Tiered work, tasted before it's made, styled to the day.",
        includes: ["Two tiers and up", "Tasting box first", "Site styling notes", "Delivery quoted separately"] }
    ],

    /* -- how it works ----------------------------------------------------- */
    process: [
      { n: "01", title: "Tell her what you're dreaming of",
        note: "A sentence is enough to start. Occasion, mood, the person it's for." },
      { n: "02", title: "Choose your date",
        note: "Cakes and cupcakes need a week. Brownies and cookies, five days." },
      { n: "03", title: "Share your inspiration",
        note: "Colour scheme, theme, any photos you've been saving." },
      { n: "04", title: "Receive your quote",
        note: "Priced on the work involved. Confirmed by bank transfer, in full." },
      { n: "05", title: "She makes your cake",
        note: "Built, piped and finished by hand. Collected from Basingstoke." }
    ],

    /* -- testimonials ----------------------------------------------------- */
    /* DEMO CONTENT — placeholders until the studio's own reviews are added. */
    testimonialsAreDemo: true,
    testimonials: [
      { quote: "I sent one blurry screenshot and got back something better than " +
               "the thing I'd screenshotted.", who: "Chidera", what: "30th birthday" },
      { quote: "The piping is unreal up close. Everyone stopped to photograph it " +
               "before anyone would let us cut it.", who: "Simi", what: "Christening" },
      { quote: "Ordered brownies for the office and have been asked, weekly, " +
               "when I'm ordering again.", who: "Tolu", what: "Brownie box of 18" },
      { quote: "She got the colour exactly right from a photo of a dress. " +
               "Exactly right.", who: "Amara", what: "Engagement" }
    ],

    /* -- the fine print: the studio's own policy card ---------------------- */
    policy: [
      { h: "Payment", p: "All payments are made in full before your order is processed. Payment is by bank transfer." },
      { h: "Refunds", p: "Once payment has been received, no refunds are issued unless the order is cancelled by the studio due to unforeseen circumstances. Refunds are only issued where an accepted order can't be fulfilled." },
      { h: "Collection", p: "Please arrive on time. If you're running late, say so as early as you can. Orders not collected within an hour of the agreed time, without any contact, may be cancelled with no refund." },
      { h: "Changes", p: "No changes on the day of collection. Biscuit orders: changes to quantity or decoration within 48 hours of ordering. Mini loaves and muffins: flavour or quantity within 24 hours of ordering." },
      { h: "Concerns", p: "If something isn't right, get in touch within 24 hours of collection. After that it may not be possible to help." },
      { h: "Allergens", p: "Everything is made in a kitchen that handles nuts, dairy, gluten and eggs. No product can be guaranteed allergen-free." },
      { h: "Handmade", p: "Requested designs are matched as closely as possible, but each item is made by hand and may not be identical to an inspiration photo." }
    ],

    /* -- order form ------------------------------------------------------- */
    order: {
      types: ["Celebration cake", "Wedding cake", "Cupcakes", "Brownie box",
              "Cookie box", "Mini loaves or muffins", "Dessert table", "Something else"],
      budgets: ["Under £50", "£50–£80", "£80–£120", "£120–£200", "£200+", "Not sure yet"]
    }
  };
})();
