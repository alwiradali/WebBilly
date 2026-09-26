/* Megacity — the area pages (Walid's SEO checklist: Manchester, Salford,
   Swinton, Old Trafford and Manchester City Centre).

   One entry per page. `slug` is the template (templates/megacity-<slug>.html);
   its address on his domain comes from ROOT_MAP in urls.js
   (/letting-agents-salford), so "letting agents salford" lands on a page whose
   address says so. `homes` decides which live 10ninety listings it shows.

   Two kinds of rule, on purpose:
   - Manchester and Salford follow the listing's own `area`, which the 10ninety
     mapper sets from the postcode first and the town second
     (worker/studio/tenninety.js), so the area pages and the filter on
     /lettings can never disagree about which borough a home is in.
   - Swinton, Old Trafford and the city centre are places, not boroughs, so
     they go by postcode district: M27 is Swinton and Pendlebury, M16 is Old
     Trafford and its neighbours, M1 to M4 is the centre. M3 includes the
     Salford side of the Irwell (Chapel Street, Greengate, Adelphi), and the
     city centre page says so rather than pretending otherwise. */

import { ROOT_MAP } from "./urls.js";

export const AREA_PAGES = [
  { slug: "area-manchester", name: "Manchester", homes: (c) => c.area === "manchester" },
  { slug: "area-salford", name: "Salford", homes: (c) => c.area === "salford" },
  { slug: "area-swinton", name: "Swinton", homes: (c) => c.district === "M27" },
  { slug: "area-old-trafford", name: "Old Trafford", homes: (c) => c.district === "M16" },
  { slug: "area-city-centre", name: "Manchester city centre", homes: (c) => ["M1", "M2", "M3", "M4"].includes(c.district) },
].map((a) => ({ ...a, path: ROOT_MAP[a.slug] }));

export const AREA_SLUGS = AREA_PAGES.map((a) => a.slug);

export function areaPage(slug) {
  return AREA_PAGES.find((a) => a.slug === slug) || null;
}

/* "M16 0TR" -> "M16"; "m27 5fx" -> "M27"; anything else -> null */
export function districtOf(postcode) {
  const m = /^\s*([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}\s*$/i.exec(String(postcode || ""));
  return m ? m[1].toUpperCase() : null;
}
