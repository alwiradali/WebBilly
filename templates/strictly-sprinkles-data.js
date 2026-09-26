/* ============================================================
   STRICTLY SPRINKLES — the whole shop, in one file.
   ------------------------------------------------------------
   This is the only file that needs editing to change what the
   site sells. Nothing here is layout: add an item to a list and
   it appears, change a price and it changes everywhere it is
   shown AND in the order builder's running total.

   Prices are numbers in pounds. Use null for "price on enquiry"
   and the site writes "Price on enquiry" instead of a figure.

   Every `img` is a path under assets/strictly/. Swapping a
   photograph is a one-word change; nothing else moves.
   ============================================================ */
window.SS = (function () {
  "use strict";

  /* ---------- the business ---------- */
  var business = {
    name: "Strictly Sprinkles",
    strapline: "Treatboxes · Bespoke Cookies · Celebration Cakes",
    based: "Teesside",
    town: "Stockton-on-Tees",
    halal: true,
    phone: "07378684907",
    /* the same number, in the form WhatsApp's link API wants */
    whatsapp: "447378684907",
    email: "Strictlysprinkles@outlook.com",
    instagram: "strictly_sprinkles",
    instagramStudio: "studio_bystrictlysprinkles",
    tiktok: "strictlysprinkles",
    facebook: "https://www.facebook.com/share/1NUqhH57mA/",
    /* her TikTok bio says DMs there are not monitored — the site sends
       people to WhatsApp, email or Instagram, never to TikTok, to message. */
    replyWindow: "within 24 hours"
  };

  /* ---------- cakes ----------
     Sizes and prices exactly as she lists them. `opts` names which
     builder option groups apply, so a cake asks for sponge, filling
     and frosting while a pretzel box does not. */
  var cakes = [
    { id: "bento",        name: "4″ bento cake",              price: 30,  img: "work/vintage-pink-cake.webp",
      blurb: "The little one. Two people, one message piped on top." },
    { id: "bento2",       name: "4″ bento cake + 2 cupcakes", price: 35,  img: "work/umrah-cupcakes.webp",
      blurb: "The bento, with a pair of cupcakes alongside." },
    { id: "bento8",       name: "4″ bento cake + 8 cupcakes", price: 50,  img: "work/grad-cupcakes.webp",
      blurb: "Enough to go round a small table." },
    { id: "tall4",        name: "4″ tall cake",               price: 45,  img: "work/duck-cake.webp",
      blurb: "Same footprint as the bento, twice the height." },
    { id: "round6",       name: "6″ round cake",              price: 65,  img: "work/lamborghini-cake.webp",
      blurb: "The usual birthday size." },
    { id: "round6tall",   name: "6″ round cake, tall",        price: 80,  img: "work/pawpatrol-cake.webp",
      blurb: "More layers of sponge, the same width." },
    { id: "heart6",       name: "6″ heart cake",              price: 70,  img: "work/vintage-heart-cake.webp",
      blurb: "Heart tin. Engagements, anniversaries, Valentine's." },
    { id: "round8",       name: "8″ round cake",              price: 85,  img: "work/nikkah-cake.webp",
      blurb: "The bigger round, for a proper party." },
    { id: "round8tall",   name: "8″ round cake, tall",        price: 100, img: "work/tiered-blue-gold.webp",
      blurb: "The showpiece. Tall, sharp edges, plenty to cut." },
    { id: "heart8",       name: "8″ heart cake",              price: 95,  img: "work/vintage-heart-cake.webp",
      blurb: "The heart, scaled up for a proper crowd." }
  ];

  /* ---------- cookies ---------- */
  var cookies = [
    { id: "ck-royal",   name: "Royal icing cookies", price: 36, unit: "per dozen", img: "work/nikkah-cookies.webp",
      blurb: "Flooded, hand-piped and personalised. Names, dates, florals." },
    { id: "ck-fondant", name: "Fondant cookies",     price: 30, unit: "per dozen", img: "work/baby-girl-box.webp",
      blurb: "Smooth fondant tops, embossed detail, edible images." }
  ];

  /* ---------- party platters ----------
     Named and priced from her own Party Platters artwork. */
  var platters = [
    { id: "pp-basic", name: "Basic Party Platter", count: 30, price: 70, img: "work/macaron-boxes.webp",
      includes: ["6 cakesicles", "6 small cheesecakes", "6 macarons", "6 pretzels", "6 Rice Krispies"] },
    { id: "pp-regular", name: "Regular Party Platter", count: 60, price: 130, img: "work/chaat-table.webp",
      includes: ["12 cakesicles", "12 small cheesecakes", "12 macarons", "12 pretzels", "12 Rice Krispies"] },
    { id: "pp-ultimate", name: "Ultimate Party Platter", count: 108, price: 225, img: "work/dessert-table.webp",
      includes: ["12 cakesicles", "24 dessert cups", "12 macarons", "12 pretzels", "12 Rice Krispies",
                 "12 cookies", "12 chocolate strawberries, or a filled number or letter", "12 cupcakes"] }
  ];

  /* ---------- individual treats — per dozen only ---------- */
  var individual = [
    { group: "Sweets", items: [
      { id: "iv-cakesicles", name: "Cakesicles",           price: 24, img: "work/date-boxes.webp" },
      { id: "iv-krispies",   name: "Rice Krispies",        price: 18, img: "work/date-boxes.webp" },
      { id: "iv-pretzels",   name: "Pretzels",             price: 18, img: "work/date-boxes.webp" },
      { id: "iv-strawb",     name: "Chocolate strawberries", price: 18, img: "work/dessert-table.webp" },
      { id: "iv-brownies",   name: "Brownies",             price: 24, img: "work/grad-cupcakes.webp" }
    ]},
    { group: "Dessert cups", items: [
      { id: "iv-chs-sm",  name: "Small cheesecakes",   price: 12, img: "work/dessert-table.webp" },
      { id: "iv-chs-rg",  name: "Regular cheesecakes", price: 24, img: "work/dessert-table.webp" },
      { id: "iv-trifle",  name: "Trifles",             price: 24, img: "work/dessert-table.webp" },
      { id: "iv-tira",    name: "Tiramisu",            price: 36, img: "work/chaat-table.webp" },
      { id: "iv-milk",    name: "Milk cake",           price: 36, img: "work/dessert-table.webp" },
      { id: "iv-pots",    name: "Cake pots",           price: 30, img: "work/chaat-table.webp" }
    ]},
    { group: "Baked", items: [
      { id: "iv-cupcakes", name: "Cupcakes",  price: 36, img: "work/umrah-cupcakes.webp" },
      { id: "iv-mini",     name: "Mini cakes", price: 36, img: "work/vintage-pink-cake.webp" },
      { id: "iv-macarons", name: "Macarons",   price: 24, img: "work/macaron-boxes.webp" }
    ]}
  ];

  /* ---------- treatboxes and baby boxes ----------
     No published prices — these are quoted per order, so the site says so
     rather than inventing a figure. Add `price: 45` to any of them and the
     figure appears and starts counting in the builder automatically. */
  var treatboxes = [
    { id: "tb-small",   name: "Small treatbox",   price: null, img: "work/macaron-boxes.webp" },
    { id: "tb-regular", name: "Regular treatbox", price: null, img: "work/mehndi-box.webp" },
    { id: "tb-large",   name: "Large treatbox",   price: null, img: "work/nikkah-box.webp" },
    { id: "tb-xl",      name: "Extra large treatbox", price: null, img: "work/date-boxes.webp" },
    { id: "tb-ult",     name: "Ultimate treatbox", price: null, img: "work/chaat-table.webp" }
  ];

  var babyboxes = [
    { id: "bb-1",     name: "Baby box — option one", price: null, img: "work/baby-girl-box.webp",
      blurb: "Iced cookies, macarons and cakesicles, boxed in your colours." },
    { id: "bb-2",     name: "Baby box — option two", price: null, img: "work/baby-boy-box.webp",
      blurb: "The larger arrangement, sectioned and ribboned." },
    { id: "bb-bento", name: "Baby bento cakes",      price: null, img: "work/vintage-pink-cake.webp",
      blurb: "A 4″ bento to match the box." }
  ];

  /* ---------- seasonal ----------
     These come and go with the calendar rather than sitting on the menu all
     year, which is why they are their own list and their own section. No
     prices: a figure published for one Ramadan should not still be on the
     site the next. Add `price: 10` to any of them and it appears. */
  var seasonal = [
    { id: "sn-ramadan", name: "Ramadan date boxes", when: "Ramadan", price: null,
      img: "work/date-boxes.webp",
      blurb: "Chocolate-dipped dates, drizzled and dusted, ribboned and boxed." },
    { id: "sn-eid", name: "Mini Eid treatboxes", when: "Eid", price: null,
      img: "work/eid-box.webp",
      blurb: "Hand-iced Eid cookies and dipped treats in a small gifting box." },
    { id: "sn-paint", name: "Paint-your-own cookies", when: "Ramadan", price: null,
      img: "work/paint-cookies.webp",
      blurb: "A cookie, an edible palette and a brush — something for the little ones to do." },
    { id: "sn-mothers", name: "Mother's Day collection", when: "Mother's Day", price: null,
      img: "work/mothers-day.webp",
      blurb: "Cupcake bouquets, mini cakes and dipped strawberries, boxed to give." },
    { id: "sn-mehndi", name: "Mehndi treatboxes", when: "Mehndi season", price: null,
      img: "work/mehndi-box.webp",
      blurb: "Bangles, paisley and hearts, hand-piped in your wedding colours." },
    { id: "sn-nikkah", name: "Nikkah favours and boxes", when: "Weddings", price: null,
      img: "work/nikkah-box.webp",
      blurb: "Personalised cookies for every guest, and a large box for the couple." },
    { id: "sn-grad", name: "Graduation cupcakes", when: "Results season", price: null,
      img: "work/grad-cupcakes.webp",
      blurb: "Black Forest cupcakes with gold toppers, caps and stethoscopes." }
  ];

  /* ---------- flavours ----------
     From her Flavour Options artwork, plus the per-treat flavour lists
     from her menu notes. */
  var flavours = {
    sponge:   ["Pistachio", "Vanilla", "Chocolate", "Red Velvet", "Lemon", "Oreo", "Biscoff"],
    filling:  ["Homemade raspberry jam", "Lemon curd", "Pistachios", "Biscoff", "Oreo",
               "Fresh raspberries", "Fresh strawberries", "Cookie dough", "Kinder Bueno",
               "Cream cheese frosting"],
    frosting: ["Buttercream", "White chocolate ganache"],
    /* per-treat flavour menus */
    cheesecake: ["Raspberry", "Hazelnut", "Chocolate", "Coconut", "Vanilla",
                 "White chocolate", "Mango", "Biscoff", "Cookies and cream"],
    cakepot:    ["Vanilla and jam", "Chocolate", "Red velvet", "Lemon", "Pistachio"],
    cupcake:    ["Chocolate", "Vanilla", "Pistachio"],
    minicake:   ["Vanilla and jam", "Chocolate", "Red velvet", "Lemon", "Pistachio"],
    macaron:    ["Coconut", "Chocolate", "Pistachio", "Vanilla", "Mango", "Lemon"],
    brownie:    ["Brookies", "Regular", "Biscoff"]
  };

  var allergyNote = "It is your responsibility to make us aware of any allergies we need to cater for.";

  /* ---------- the order builder ----------
     `opts` on a category decides which question groups the builder asks.
     Drop "filling" from a category and that step stops being asked. */
  var categories = [
    { id: "cakes",      label: "Cakes",            items: cakes,      unit: "cake",
      opts: ["sponge", "filling", "frosting"], img: "work/tiered-blue-gold.webp",
      note: "Every cake is made to your design — send a picture and I'll price it." },
    { id: "cookies",    label: "Cookies",          items: cookies,    unit: "dozen",
      opts: [], img: "work/nikkah-cookies.webp",
      note: "Personalised with names, dates and your colours." },
    { id: "platters",   label: "Party platters",   items: platters,   unit: "platter",
      opts: ["platterFlavours"], img: "work/dessert-table.webp",
      note: "A little of everything, packed to match your theme." },
    { id: "individual", name: "Individual treats", label: "Individual treats",
      items: null, groups: individual, unit: "dozen",
      opts: ["treatFlavour"], img: "work/macaron-boxes.webp",
      note: "Per dozen only. Perfect for party extras and gift boxes." },
    { id: "treatboxes", label: "Treatboxes",       items: treatboxes, unit: "box",
      opts: ["treatFlavour"], img: "work/nikkah-box.webp",
      note: "Five sizes, filled with whichever treats you like." },
    { id: "babyboxes",  label: "Baby boxes",       items: babyboxes,  unit: "box",
      opts: ["treatFlavour"], img: "work/baby-girl-box.webp",
      note: "For showers, gender reveals and new arrivals." }
  ];

  var occasions = ["Birthday", "Nikkah / wedding", "Engagement", "Baby shower",
                   "Gender reveal", "Anniversary", "Eid", "Mehndi", "Thank you", "Just because"];

  /* ---------- her terms, transcribed ----------
     Word for word from her own Terms and Conditions artwork. These are the
     terms a customer is agreeing to; paraphrasing them would change them. */
  var terms = [
    { h: "Placing an order", l: [
      "Allow up to 24 hours for a reply.",
      "Let us know when you would like the cake, any inspiration pictures you have, and what flavours you would like, so we can give you a quote."
    ]},
    { h: "Deposits and final payments", l: [
      "All orders over £30 require a 50% non-refundable deposit (with 5 days notice) via bank transfer.",
      "Orders will only be confirmed once the deposit has been paid.",
      "Failure to pay the deposit may lead to your order being cancelled.",
      "Final payment is to be made 24 hrs before collection."
    ]}
  ];

  var cakeCare = [
    { h: "Transporting the cake", p: "To ensure the cake is transported safely, place it on the floor on the front passenger side." },
    { h: "Storing the cake", p: "All cakes are to be stored in a cool, dry place between collection and serving. If you have to keep it in the fridge, make sure it is removed before serving to allow time to return to room temperature." }
  ];

  /* ---------- reviews ----------
     PLACEHOLDERS. Nothing here is a real customer: they are written as
     examples so the section can be judged with words in it, and every one
     is labelled as an example on the page. Replace `reviews` with her real
     Google reviews and delete `reviewsAreExamples` to drop the label. */
  var reviewsAreExamples = true;
  var reviews = [
    { name: "Example review", stars: 5, when: "—",
      text: "Ordered a treatbox for my sister's baby shower and it turned out exactly like the picture I sent. Everything tasted as good as it looked." },
    { name: "Example review", stars: 5, when: "—",
      text: "The nikkah cookies were the thing everyone photographed. Beautifully boxed and delivered on time." },
    { name: "Example review", stars: 5, when: "—",
      text: "Second cake I've ordered. Quick to reply, talked me through the flavours and the drip was perfect." }
  ];

  var faq = [
    { q: "How do I order?", a: "Use the enquiry form on this page — it walks through the size, the flavours and the date, then sends the whole thing to my WhatsApp or my inbox in one message. You can also DM me on Instagram if you would rather." },
    { q: "How far in advance should I order?", a: "The more notice the better, especially for a weekend. Deposits need five days' notice, so five days is the realistic minimum for anything over £30." },
    { q: "What secures the date?", a: "A 50% non-refundable deposit by bank transfer on anything over £30. The order is confirmed once that has been paid, and the balance is due 24 hours before collection." },
    { q: "Can you match a picture I've seen?", a: "Send it with your enquiry. Inspiration pictures are the fastest way to an accurate quote — I'll tell you honestly what I can and can't do." },
    { q: "Is everything halal?", a: "Yes. Everything is halal." },
    { q: "Do you do bigger or tiered cakes?", a: "Yes — tiered cakes and anything not listed here are quoted individually. Get in touch and tell me what you have in mind." },
    { q: "Do you deliver?", a: "Most orders are collection from Stockton-on-Tees. Ask when you enquire and I'll let you know what's possible for your date." }
  ];

  return {
    business: business, categories: categories, cakes: cakes, cookies: cookies,
    platters: platters, individual: individual, treatboxes: treatboxes,
    babyboxes: babyboxes, seasonal: seasonal, flavours: flavours, allergyNote: allergyNote,
    occasions: occasions, terms: terms, cakeCare: cakeCare,
    reviews: reviews, reviewsAreExamples: reviewsAreExamples, faq: faq
  };
})();
