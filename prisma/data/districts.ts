// Sierra Leone's 16 districts (2017 boundaries).
// Coordinates are the district headquarter town, used as the forecast point
// for weather (PRD 6.4). They are approximate and good enough for a 7-day forecast.

export type DistrictSeed = {
  name: string;
  slug: string;
  province: string;
  headquarters: string;
  latitude: number;
  longitude: number;
  chiefdoms: string[];
};

// Chiefdoms are a starter sample (not the full list of ~190) and must be completed
// from the official Statistics Sierra Leone list before launch.
// The Western Area has no chiefdoms, so it lists its rural districts / urban areas.
export const districts: DistrictSeed[] = [
  // Eastern Province
  { name: "Kailahun", slug: "kailahun", province: "Eastern", headquarters: "Kailahun", latitude: 8.2789, longitude: -10.5739, chiefdoms: ["Luawa", "Jawei", "Kissi Teng"] },
  { name: "Kenema", slug: "kenema", province: "Eastern", headquarters: "Kenema", latitude: 7.8767, longitude: -11.1875, chiefdoms: ["Nongowa", "Dama", "Lower Bambara"] },
  { name: "Kono", slug: "kono", province: "Eastern", headquarters: "Koidu", latitude: 8.6439, longitude: -10.9714, chiefdoms: ["Gbense", "Nimikoro", "Tankoro"] },
  // Northern Province
  { name: "Bombali", slug: "bombali", province: "Northern", headquarters: "Makeni", latitude: 8.8833, longitude: -12.0442, chiefdoms: ["Bombali Shebora", "Makari", "Biriwa"] },
  { name: "Falaba", slug: "falaba", province: "Northern", headquarters: "Bendugu", latitude: 9.55, longitude: -11.35, chiefdoms: ["Mongo", "Sulima", "Dembelia Sinkunia"] },
  { name: "Koinadugu", slug: "koinadugu", province: "Northern", headquarters: "Kabala", latitude: 9.5889, longitude: -11.5525, chiefdoms: ["Wara Wara Yagala", "Sengbe", "Diang"] },
  { name: "Tonkolili", slug: "tonkolili", province: "Northern", headquarters: "Magburaka", latitude: 8.7231, longitude: -11.9486, chiefdoms: ["Kholifa Rowalla", "Kunike", "Yoni"] },
  // North West Province
  { name: "Kambia", slug: "kambia", province: "North West", headquarters: "Kambia", latitude: 9.1256, longitude: -12.9178, chiefdoms: ["Magbema", "Samu", "Tonko Limba"] },
  { name: "Karene", slug: "karene", province: "North West", headquarters: "Kamakwie", latitude: 9.4967, longitude: -12.2408, chiefdoms: ["Sella Limba", "Sanda Loko", "Tambakha"] },
  { name: "Port Loko", slug: "port-loko", province: "North West", headquarters: "Port Loko", latitude: 8.7667, longitude: -12.7875, chiefdoms: ["Maforki", "Lokomasama", "Kaffu Bullom"] },
  // Southern Province
  { name: "Bo", slug: "bo", province: "Southern", headquarters: "Bo", latitude: 7.9647, longitude: -11.7383, chiefdoms: ["Kakua", "Tikonko", "Badjia"] },
  { name: "Bonthe", slug: "bonthe", province: "Southern", headquarters: "Mattru Jong", latitude: 7.6244, longitude: -12.1817, chiefdoms: ["Jong", "Sittia", "Imperri"] },
  { name: "Moyamba", slug: "moyamba", province: "Southern", headquarters: "Moyamba", latitude: 8.1606, longitude: -12.4331, chiefdoms: ["Kaiyamba", "Fakunya", "Ribbi"] },
  { name: "Pujehun", slug: "pujehun", province: "Southern", headquarters: "Pujehun", latitude: 7.3503, longitude: -11.7208, chiefdoms: ["Galliness Perri", "Sorogbema", "Barri"] },
  // Western Area
  { name: "Western Area Rural", slug: "western-area-rural", province: "Western Area", headquarters: "Waterloo", latitude: 8.3389, longitude: -13.0708, chiefdoms: ["Koya Rural", "Mountain Rural", "Waterloo Rural", "York Rural"] },
  { name: "Western Area Urban", slug: "western-area-urban", province: "Western Area", headquarters: "Freetown", latitude: 8.4844, longitude: -13.2344, chiefdoms: ["Central Freetown", "East Freetown", "West Freetown"] },
];
