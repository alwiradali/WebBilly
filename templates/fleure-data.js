/* ============================================================
   FLEURÉ & CO. — the whole shop in one file.
   Everything the site says comes from here: change a price, a
   policy or a photograph in this file and every page follows. Nothing
   below is invented — the policies are transcribed from the shop's own T&Cs and
   "How to order" story highlights, and the photographs are its own.
   ============================================================ */
window.FLEURE = (function () {

  var business = {
    name: "Fleuré & Co.",
    tagline: "Nottingham florist",
    town: "Nottingham",
    instagram: "xfleureco",
    tiktok: "xfleureco",
    /* ------------------------------------------------------------------
       THE SHOP EMAIL GOES HERE. Left empty on purpose rather than guessed: an
       enquiry sent to the wrong address is worse than one that never
       arrives. While this is empty the enquiry form sends through
       Instagram instead — which is the route the bio advertises — and
       the email button hides itself. Fill it in and the button appears.
       ------------------------------------------------------------------ */
    email: "",
    /* Same again: the bio advertises DMs, not a number. Add one and a WhatsApp
       route appears beside the others, everywhere. */
    phone: ""
  };

  /* What the shop makes. Four, because that is what the feed actually shows:
     fresh, faux, baskets, and the bespoke work that is none of the three. */
  var collections = [
    {
      id: "fresh", slug: "fleure-fresh", name: "Fresh bouquets",
      blurb: "Roses, spray roses, gerberas, carnations and stocks, wrapped by hand the day they go out.",
      note: "Wrapped in our own paper and pearl trim, finished with the Fleuré seal.",
      img: "work/pink-car.webp",
      alt: "Fresh bouquet of bright pink and red roses with gypsophila",
      intro: "Cut stems, bought in for your date and wrapped the day they go out. Tell us the " +
             "colours and the budget and we will build the fullest bouquet that money buys — " +
             "there is no fixed size, because no two orders want the same thing.",
      points: [
        "Roses, spray roses, gerberas, carnations, chrysanthemums and stocks, depending on the week.",
        "Wrapped by hand in our own paper, with the pearl trim and the Fleuré seal.",
        "Built to your budget rather than to a set list of sizes."
      ],
      photos: ["work/pink-pearls.webp","work/spray-roses.webp","work/peach-car.webp",
               "work/pink-car.webp","work/pink-perfection.webp","work/gerbera.webp"]
    },
    {
      id: "forever", slug: "fleure-forever", name: "Forever florals",
      blurb: "Faux stems arranged the same way as the fresh ones, for a gift that stays.",
      note: "Good for a first home, a desk, or anywhere fresh flowers will not last.",
      img: "work/faux-basket.webp",
      alt: "Faux flower basket in pinks and cream",
      intro: "The same arranging, in faux stems instead of cut ones. It needs no water and it " +
             "does not drop — which makes it the right choice for a gift that has to travel, " +
             "an office, or a room that never gets enough light.",
      points: [
        "Arranged by hand exactly as a fresh bouquet is, so it does not read as artificial.",
        "No water, no wilting — it keeps looking the way it did on the day.",
        "Baskets, bouquets or a standing arrangement, whichever suits where it is going."
      ],
      photos: ["work/faux-basket.webp"]
    },
    {
      id: "baskets", slug: "fleure-bloom-baskets", name: "Bloom baskets",
      blurb: "Flowers arranged around whatever you want to give with them — perfume, candles, jewellery.",
      note: "Built to your colours, your flowers and your budget.",
      img: "work/bloom-basket.webp",
      alt: "Bloom basket of roses arranged around perfume, a candle and a ring box",
      intro: "A basket where the gift sits inside the flowers rather than next to them. Send " +
             "the perfume, the candle or the box over, or tell us what to include and we will " +
             "source it, and the whole thing is arranged around it.",
      points: [
        "Customised to suit your preferred colours, flowers and budget.",
        "Each basket is arranged to be a beautiful and unique design in its own right.",
        "Beauty products, gifts or anything else you would like can be included on request."
      ],
      photos: ["work/bloom-basket.webp","work/faux-basket.webp"]
    },
    {
      id: "bespoke", slug: "fleure-bespoke", name: "Something bespoke",
      blurb: "A colour you have in mind, a photograph you have saved, a bouquet for a date that matters.",
      note: "Custom orders welcome — send the picture and we will tell you what it takes.",
      img: "work/red-grass.webp",
      alt: "Ten premium red roses in a black wrap with pearl trim",
      intro: "Anything that is not one of the three above. A set count of premium roses, a " +
             "colour you have been picturing, a photograph you saved months ago. Send it over " +
             "and we will tell you honestly what we can match and what it would cost.",
      points: [
        "Send an inspiration photo and we will say what is possible before anything is agreed.",
        "Set counts — ten premium red roses, say — as well as open-ended designs.",
        "Last-minute and same-day are often possible, subject to availability."
      ],
      photos: ["work/red-grass.webp","work/pink-pearls.webp","work/peach-car.webp"]
    }
  ];

  /* The "How to order" highlight, in its own order. */
  var howToOrder = [
    { h: "Fresh or forever", p: "Real stems for the day, or faux florals that keep." },
    { h: "Colours and style", p: "Soft and pale, deep and romantic, or one colour throughout." },
    { h: "Your budget", p: "Tell us the figure and we will build the fullest bouquet it buys." },
    { h: "The occasion", p: "Birthday, anniversary, new baby, thank you, or no reason at all." },
    { h: "The date", p: "When you need it in your hands, and whether you are collecting." }
  ];
  var inspirationNote = "You are welcome to send an inspiration photo too.";
  var confirmNote = "We will confirm your design, price and availability before starting your bouquet.";

  /* Bloom baskets, from the shop's own highlight. */
  var basketPoints = [
    "Customised to suit your preferred colours, flowers and budget.",
    "Each basket is arranged to be a beautiful and unique design in its own right.",
    "Beauty products, gifts or anything else you would like can be included on request."
  ];

  /* The policies, transcribed. They are written as "we" and that is kept. */
  var policies = [
    { h: "Orders", l: [
      "Please place your order in advance to avoid disappointment.",
      "Orders are only confirmed once all details have been agreed.",
      "Changes to an order must be requested as early as possible."
    ]},
    { h: "Payment & delivery", l: [
      "A deposit is required to secure your order.",
      "Please arrive on time for collection.",
      "Delivery is available at an additional cost, confirmed when ordering.",
      "Collection or delivery details and times will be agreed when ordering."
    ]},
    { h: "Last-minute orders", l: [
      "We do accept last-minute and same-day orders, subject to availability.",
      "Same-day orders carry an additional fee, for the urgent sourcing and preparation.",
      "Message as soon as you can with what you need and we will do our best to accommodate you."
    ]}
  ];

  var occasions = [
    "Birthday", "Anniversary", "Wedding or nikkah", "New baby", "Thank you",
    "Get well", "Sympathy", "Just because", "Something else"
  ];

  var palettes = [
    "Soft pinks and cream", "Deep reds and burgundy", "Blush and white",
    "Bright and mixed", "All white", "Let us choose"
  ];

  /* The photographs, strongest first. The home page shows the first six and
     the rest live on the work page, so this order is what a first-time
     visitor is judged by. */
  var work = [
    { src: "work/pink-pearls.webp",      alt: "Pink and red rose bouquet with gypsophila and pearl trim" },
    { src: "work/spray-roses.webp",      alt: "Spray rose bouquet in cream and pink" },
    { src: "work/bloom-basket.webp",     alt: "Bloom basket arranged around perfume, a candle and a ring box" },
    { src: "work/red-grass.webp",        alt: "Ten premium red roses in a black wrap with pearl trim" },
    { src: "work/peach-car.webp",        alt: "Peach roses, red carnations and cream stocks" },
    { src: "work/faux-basket.webp",      alt: "Faux flower basket in pinks and cream" },
    { src: "work/pink-car.webp",         alt: "Bright pink and red roses with gypsophila" },
    { src: "work/pink-perfection.webp",  alt: "Pink roses and carnations with gypsophila" },
    { src: "work/gerbera.webp",          alt: "Gerberas, chrysanthemums and roses in pink and white" }
  ];

  /* PLACEHOLDERS. Every one is labelled "Example review" where a customer's
     name goes, so none of them can read as real. Replace the whole list with
     the real Google reviews, names and all, before the site is shown around. */
  var reviews = [
    { name: "Example review", stars: 5,
      text: "Ordered a bouquet for my mum's birthday and it was better than the picture I sent. Wrapped beautifully and ready exactly when they said." },
    { name: "Example review", stars: 5,
      text: "The bloom basket was such a lovely idea — they arranged the flowers around the perfume I sent over and it looked incredible." },
    { name: "Example review", stars: 5,
      text: "Asked for something last minute and they still managed it. Kept me updated the whole way and the roses lasted over a week." }
  ];

  var faq = [
    { q: "How do I order?", a: "Use the enquiry form on this page. It asks the same five things we would ask in a message — fresh or forever, colours, budget, occasion and date — so your enquiry arrives complete and we can price it straight away." },
    { q: "How far ahead should I order?", a: "As far ahead as you can. Weekends and occasions like Mother's Day and Valentine's fill first, and ordering early is the only way to be sure of the flowers you want." },
    { q: "Can you do same-day?", a: "Often, yes — subject to availability. Same-day orders carry an additional fee for the urgent sourcing and preparation, so send your message as early in the day as you can." },
    { q: "What secures the date?", a: "A deposit. Your order is confirmed once all the details have been agreed and the deposit is paid." },
    { q: "Can I send a picture of what I want?", a: "Please do. We will tell you honestly what we can match, what we would do differently and what it changes about the price." },
    { q: "Collection or delivery?", a: "Both. Delivery is available across Nottingham at an additional cost, confirmed when you order. Collection and delivery times are agreed when ordering." },
    { q: "What is a forever bouquet?", a: "The same arranging, in faux stems instead of fresh. It looks like the real thing and it does not need water — good for a gift that has to travel, or anywhere fresh flowers will not last." },
    { q: "Can you put gifts in with the flowers?", a: "Yes — that is what a bloom basket is. Beauty products, perfume, a candle, jewellery: send them over or tell us what you would like included, and we will arrange the flowers around them." }
  ];

  return {
    business: business, collections: collections, howToOrder: howToOrder,
    inspirationNote: inspirationNote, confirmNote: confirmNote,
    basketPoints: basketPoints, policies: policies, occasions: occasions,
    palettes: palettes, work: work, reviews: reviews, faq: faq
  };
})();
