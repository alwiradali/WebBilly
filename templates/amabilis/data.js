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

    /* -- the cakes ---------------------------------------------------------
       Stock photography (Pexels — free for commercial use, no attribution).
       Every one of these is a placeholder for one of her own cakes: keep the
       slug, drop her photograph in at the same path, done. */
    cakes: [
      { slug:"rose", name:"Rose", occasion:"Birthday", line:"Vintage piping, in blush",
        note:"Heritage piping worked shell by shell — ribbon swags, a scalloped collar and a hand-lettered plaque, boxed and tied before it leaves the kitchen.",
        finish:"Vintage piped buttercream", serves:"12–16", from:65,
        img:STK+"cake-rose.webp", detail:STK+"cake-petal.webp", tone:"blush",
        alt:"Blush pink vintage-piped celebration cake with a scalloped collar and a hand-lettered plaque" },
      { slug:"bloom", name:"Bloom", occasion:"Celebration", line:"Covered in flowers",
        note:"Sugar confetti through the buttercream, a crown of fresh blooms and a hand-lettered topper. The one people photograph before anyone is allowed to cut it.",
        finish:"Speckled buttercream, fresh florals", serves:"16–20", from:85,
        img:STK+"cake-bloom.webp", detail:STK+"cake-marble.webp", tone:"blush",
        alt:"Pale pink celebration cake scattered with sugar confetti under a crown of fresh flowers" },
      { slug:"ivory", name:"Ivory", occasion:"Milestone", line:"Piped, and gilded",
        note:"A classic piped shell finish under gold numerals. Quiet from across the room, and worth walking over to.",
        finish:"Piped buttercream, gold leaf", serves:"16–20", from:85,
        img:STK+"cake-ivory.webp", detail:STK+"cake-linen.webp", tone:"cream",
        alt:"Ivory piped buttercream cake finished with gold milestone numerals" },
      { slug:"noir", name:"Noir", occasion:"Wedding",
        line:"Black tie, three tiers",
        note:"Tiered work in charcoal buttercream, dressed on the day with whatever is in season. Tasted before it is made.",
        finish:"Charcoal buttercream, fresh flowers", serves:"60+", from:120,
        img:STK+"cake-noir.webp", detail:STK+"cake-marble.webp", tone:"dark",
        alt:"Tall black tiered wedding cake on a dressed table surrounded by white flowers" },
      { slug:"marble", name:"Marble", occasion:"Engagement", line:"Stone, and marigold",
        note:"A marbled two-tier with a single seam of colour and fresh flowers set at the join. Modern, and not fussy about it.",
        finish:"Marbled buttercream", serves:"30–40", from:120,
        img:STK+"cake-marble.webp", detail:STK+"cake-berry.webp", tone:"cream",
        alt:"Marbled two-tier cake decorated with orange and blush flowers at the tier join" },
      { slug:"berry", name:"Berry", occasion:"Summer", line:"Cream and fruit",
        note:"Whipped vanilla, seasonal berries piled on top and nothing else. The one everyone finishes.",
        finish:"Whipped cream, fresh fruit", serves:"12–16", from:65,
        img:STK+"cake-berry.webp", detail:STK+"cake-linen.webp", tone:"cream",
        alt:"White cream cake topped with fresh strawberries, blackberries and mint" },
      { slug:"petal", name:"Petal", occasion:"Anniversary", line:"Pressed flowers, gold",
        note:"Dried petals and edible gold pressed into a bare white finish. Almost nothing on it, and it takes the longest.",
        finish:"Smooth buttercream, dried florals, gold", serves:"12–16", from:85,
        img:STK+"cake-petal.webp", detail:STK+"cake-ivory.webp", tone:"cream",
        alt:"Minimal white cake decorated with pressed dried flowers and flecks of edible gold" },
      { slug:"linen", name:"Linen", occasion:"Christening", line:"As plain as it gets",
        note:"A single tier, piped collar, nothing else. Proof that plain is a decision rather than a shortcut.",
        finish:"Piped buttercream", serves:"10–14", from:45,
        img:STK+"cake-linen.webp", detail:STK+"cake-rose.webp", tone:"cream",
        alt:"Plain white piped cake on a stand beside brass candlesticks" }
    ],

    /* -- the shop ----------------------------------------------------------
       Real products at her real prices. There is no payment gateway: she takes
       bank transfer, so the basket ends in a written order plus her transfer
       details rather than a card form. Wiring Stripe in later only changes the
       checkout step. */
    shop: [
      {
        id: "cookie",
        name: "Cookie box",
        blurb: "Thick, soft-baked and boxed the morning they go out. Mix the flavours across a box — just say which.",
        img: STK + "cookie-stack.webp",
        alt: "A stack of thick chocolate chip cookies on a white plate",
        lead: 5,
        flavours: ["Triple chocolate", "White chocolate", "Plain chocolate chip", "Oreo"],
        sizes: [ { qty: 6, price: 15 }, { qty: 9, price: 22 },
                 { qty: 12, price: 28 }, { qty: 18, price: 40 } ]
      },
      {
        id: "brownie",
        name: "Brownie box",
        blurb: "Fudgy in the middle, paper-thin crust on top. Cut generously and boxed with a knife's worth of care.",
        img: STK + "brownie-dusted.webp",
        alt: "Squares of brownie dusted with icing sugar on a wooden board",
        lead: 5,
        flavours: ["Triple chocolate", "White chocolate", "Lotus Biscoff", "Chocolate & strawberry"],
        sizes: [ { qty: 6, price: 15 }, { qty: 9, price: 22 },
                 { qty: 12, price: 28 }, { qty: 18, price: 40 } ]
      }
    ],

    /* Bank details are deliberately not in the source — she sends them once an
       order is confirmed. Change this line if she wants them shown up front. */
    payment: {
      method: "Bank transfer",
      note: "She'll send bank details to confirm. Orders are made once payment clears."
    },

    /* -- the boxes, in pictures -------------------------------------------- */
    cookieShots: [
      { img:STK+"cookie-stack.webp", alt:"A stack of thick chocolate chip cookies on a white plate" },
      { img:STK+"cookie-tray.webp",  alt:"Chocolate chip cookies fresh from the oven on a baking tray" },
      { img:STK+"cookie-dark.webp",  alt:"Chocolate chip cookies on a dark surface scattered with petals" },
      { img:STK+"cookie-warm.webp",  alt:"Golden cookies surrounded by scattered chocolate chips" }
    ],
    brownieShots: [
      { img:STK+"brownie-drizzle.webp", alt:"Brownie slices under a ribbon of warm chocolate sauce" },
      { img:STK+"brownie-dusted.webp",  alt:"Squares of brownie dusted with icing sugar on a wooden board" },
      { img:STK+"brownie-rack.webp",    alt:"A stack of fudgy brownies cooling on a wire rack" },
      { img:STK+"brownie-bowl.webp",    alt:"Rich chocolate brownies piled in a white dish" }
    ],

    /* -- the swiping counter ------------------------------------------------ */
    counter: [
      STK+"cake-rose.webp", STK+"cookie-stack.webp", STK+"brownie-drizzle.webp",
      STK+"cake-bloom.webp", STK+"craft-drip.webp", STK+"cake-ivory.webp",
      STK+"brownie-dusted.webp", STK+"cake-marble.webp", STK+"cookie-tray.webp",
      STK+"cake-berry.webp", STK+"craft-spatula.webp", STK+"cake-petal.webp",
      STK+"brownie-rack.webp", STK+"cookie-warm.webp", STK+"cake-noir.webp",
      STK+"craft-turntable.webp", STK+"cake-linen.webp", STK+"brownie-bowl.webp"
    ],

    /* Her own photographs replace the stock set above one for one: same slug,
       same path, no other change. The four she has already sent (Christmas,
       macaron drip, God Bless christening, peony) are listed in
       assets/amabilis/README.md with the filenames to save them as. */

    /* -- the shop ----------------------------------------------------------
       Real products at her real prices. There is no payment gateway: she takes
       bank transfer, so the basket ends in a written order plus her transfer
       details rather than a card form. Wiring Stripe in later only changes the
       checkout step. */
    shop: [
      {
        id: "cookie",
        name: "Cookie box",
        blurb: "Thick, soft-baked and boxed the morning they go out. Mix the flavours across a box — just say which.",
        img: STK + "cookie-stack.webp",
        alt: "A stack of thick chocolate chip cookies on a white plate",
        lead: 5,
        flavours: ["Triple chocolate", "White chocolate", "Plain chocolate chip", "Oreo"],
        sizes: [ { qty: 6, price: 15 }, { qty: 9, price: 22 },
                 { qty: 12, price: 28 }, { qty: 18, price: 40 } ]
      },
      {
        id: "brownie",
        name: "Brownie box",
        blurb: "Fudgy in the middle, paper-thin crust on top. Cut generously and boxed with a knife's worth of care.",
        img: STK + "brownie-dusted.webp",
        alt: "Squares of brownie dusted with icing sugar on a wooden board",
        lead: 5,
        flavours: ["Triple chocolate", "White chocolate", "Lotus Biscoff", "Chocolate & strawberry"],
        sizes: [ { qty: 6, price: 15 }, { qty: 9, price: 22 },
                 { qty: 12, price: 28 }, { qty: 18, price: 40 } ]
      }
    ],

    /* Bank details are deliberately not in the source — she sends them once an
       order is confirmed. Change this line if she wants them shown up front. */
    payment: {
      method: "Bank transfer",
      note: "She'll send bank details to confirm. Orders are made once payment clears."
    },

    /* -- the boxes, in pictures -------------------------------------------- */
    cookieShots: [
      { img:STK+"cookie-stack.webp", alt:"A stack of thick chocolate chip cookies on a white plate" },
      { img:STK+"cookie-tray.webp",  alt:"Chocolate chip cookies fresh from the oven on a baking tray" },
      { img:STK+"cookie-dark.webp",  alt:"Chocolate chip cookies on a dark surface scattered with petals" },
      { img:STK+"cookie-warm.webp",  alt:"Golden cookies surrounded by scattered chocolate chips" }
    ],
    brownieShots: [
      { img:STK+"brownie-drizzle.webp", alt:"Brownie slices under a ribbon of warm chocolate sauce" },
      { img:STK+"brownie-dusted.webp",  alt:"Squares of brownie dusted with icing sugar on a wooden board" },
      { img:STK+"brownie-rack.webp",    alt:"A stack of fudgy brownies cooling on a wire rack" },
      { img:STK+"brownie-bowl.webp",    alt:"Rich chocolate brownies piled in a white dish" }
    ],

    /* -- the swiping counter ------------------------------------------------ */
    counter: [
      STK+"cake-rose.webp", STK+"cookie-stack.webp", STK+"brownie-drizzle.webp",
      STK+"cake-bloom.webp", STK+"craft-drip.webp", STK+"cake-ivory.webp",
      STK+"brownie-dusted.webp", STK+"cake-marble.webp", STK+"cookie-tray.webp",
      STK+"cake-berry.webp", STK+"craft-spatula.webp", STK+"cake-petal.webp",
      STK+"brownie-rack.webp", STK+"cookie-warm.webp", STK+"cake-noir.webp",
      STK+"craft-turntable.webp", STK+"cake-linen.webp", STK+"brownie-bowl.webp"
    ],

    /* Her own photographs replace the stock set above one for one: same slug,
       same path, no other change. The four she has already sent (Christmas,
       macaron drip, God Bless christening, peony) are listed in
       assets/amabilis/README.md with the filenames to save them as. */

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
      { name: "Birthday cakes",   note: "Single tier, sculpted, or piped to a theme.", img: STK + "cake-rose-sm.webp" },
      { name: "Celebration cakes",note: "Engagements, christenings, anniversaries, graduations.", img: STK + "cake-bloom-sm.webp" },
      { name: "Wedding cakes",    note: "Tiered work, tasting first, styled to the day.", img: STK + "cake-noir-sm.webp" },
      { name: "Cupcakes",         note: "Piped and finished to match the cake.", img: STK + "craft-piping-sm.webp" },
      { name: "Brownies & cookies", note: "Boxed by the six, nine, twelve or eighteen.", img: STK + "brownie-dusted-sm.webp" },
      { name: "Mini loaves & muffins", note: "Favours, hampers, morning tables.", img: STK + "cookie-stack-sm.webp" },
      { name: "Dessert tables",   note: "One order, styled as a whole.", img: STK + "cake-marble-sm.webp" },
      { name: "Corporate & events", note: "Branded, sculpted, or kept quiet and elegant.", img: STK + "cake-linen-sm.webp" }
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
