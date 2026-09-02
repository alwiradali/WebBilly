/* Megacity Studio — the single source of every dropdown.
   Served to the UI by GET /api/studio/options and used by the Worker to
   validate writes and to label values on the public pages. Values are stored;
   labels are what people see. Keep values stable — they are in the database. */

export const OPTIONS = {
  type: [
    ["apartment", "Apartment"],
    ["studio", "Studio"],
    ["house_terraced", "Terraced house"],
    ["house_semi", "Semi-detached house"],
    ["house_detached", "Detached house"],
    ["maisonette", "Maisonette"],
    ["bungalow", "Bungalow"],
    ["room_in_share", "Room in a shared house"],
    ["hmo_whole", "Whole HMO"],
    ["commercial", "Commercial unit"],
  ],
  letType: [
    ["whole", "Whole property"],
    ["room", "Room in a share"],
    ["student", "Student let"],
  ],
  furnishing: [
    ["furnished", "Furnished"],
    ["part", "Part-furnished"],
    ["unfurnished", "Unfurnished"],
  ],
  availability: [
    ["available_now", "Available now"],
    ["from_date", "Available from a date"],
    ["let_agreed", "Let agreed"],
    ["coming_soon", "Coming soon"],
  ],
  bills: [
    ["included", "Bills included"],
    ["excluded", "Bills not included"],
    ["some", "Some bills included"],
  ],
  minTerm: [
    ["6", "6 months"],
    ["12", "12 months"],
    ["24", "24 months"],
    ["flexible", "Flexible"],
  ],
  councilTaxBand: ["A", "B", "C", "D", "E", "F", "G", "H"].map((b) => [b, "Band " + b]),
  epcRating: ["A", "B", "C", "D", "E", "F", "G"].map((r) => [r, r]).concat([["pending", "Certificate pending"]]),
  pets: [
    ["considered", "Pets considered"],
    ["yes", "Pets welcome"],
    ["no", "No pets"],
  ],
  parkingSpaces: [0, 1, 2, 3, 4, 5, 6].map((n) => [String(n), n === 0 ? "No allocated parking" : n + (n === 1 ? " space" : " spaces")]),
  area: [
    ["manchester", "Manchester"],
    ["salford", "Salford"],
    ["trafford", "Trafford"],
    ["stockport", "Stockport"],
    ["bury", "Bury"],
    ["oldham", "Oldham"],
    ["tameside", "Tameside"],
    ["rochdale", "Rochdale"],
    ["bolton", "Bolton"],
    ["wigan", "Wigan"],
  ],
  bathroom: [
    ["bathroom", "Bathroom with bath"],
    ["bath_shower_over", "Bathroom, shower over bath"],
    ["shower_room", "Shower room"],
    ["en_suite", "En-suite"],
    ["wc", "Separate WC"],
    ["wet_room", "Wet room"],
    ["shared", "Shared bathroom"],
  ],
  reception: [
    ["living", "Living room"],
    ["lounge_diner", "Lounge / diner"],
    ["open_plan", "Open-plan living"],
    ["reception", "Reception room"],
    ["dining", "Dining room"],
    ["conservatory", "Conservatory"],
  ],
  kitchen: [
    ["fitted", "Fitted kitchen"],
    ["fitted_integrated", "Fitted kitchen with integrated appliances"],
    ["kitchen_diner", "Kitchen / diner"],
    ["open_plan", "Open-plan kitchen"],
    ["shared", "Shared kitchen"],
  ],
  garden: [
    ["private_rear", "Private rear garden"],
    ["private_front", "Private front garden"],
    ["shared", "Shared garden"],
    ["communal", "Communal garden"],
    ["yard", "Yard"],
    ["balcony", "Balcony"],
    ["terrace", "Terrace"],
  ],
  driveway: [
    ["driveway_1", "Driveway, one car"],
    ["driveway_2", "Driveway, two or more cars"],
    ["garage", "Garage"],
    ["off_street", "Off-street parking"],
  ],
  status: [
    ["draft", "Draft"],
    ["live", "Live"],
    ["let_agreed", "Let agreed"],
    ["let", "Let"],
    ["withdrawn", "Withdrawn"],
  ],
  mediaRole: [
    ["gallery", "Gallery"],
    ["cover", "Cover"],
    ["epc", "EPC certificate"],
    ["floorplan", "Floor plan"],
    ["tour", "360° panorama"],
  ],
  tourRoom: [
    ["hallway", "Hallway"],
    ["living", "Living room"],
    ["kitchen", "Kitchen"],
    ["bedroom", "Bedroom"],
    ["bathroom", "Bathroom"],
    ["en_suite", "En-suite"],
    ["garden", "Garden"],
    ["driveway", "Driveway"],
    ["landing", "Landing"],
    ["other", "Other"],
  ],
  enquirySource: [
    ["viewing", "Viewing request"],
    ["contact", "Contact form"],
    ["valuation", "Valuation request"],
    ["register", "Registration"],
    ["tour", "360° tour"],
    ["maintenance", "Maintenance"],
  ],
};

/* Value → label lookup, tolerant of unknown values (returns the value). */
export function label(list, value) {
  const rows = OPTIONS[list] || [];
  for (const [v, l] of rows) if (v === String(value)) return l;
  return value == null ? "" : String(value);
}

/* True when the value is one of the list's values (or null/empty). */
export function valid(list, value) {
  if (value == null || value === "") return true;
  return (OPTIONS[list] || []).some(([v]) => v === String(value));
}

/* The same lists as {value,label} objects — what the UI consumes. */
export function asJson() {
  const out = {};
  for (const k of Object.keys(OPTIONS)) out[k] = OPTIONS[k].map(([value, label]) => ({ value, label }));
  return out;
}
