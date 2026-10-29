import type { PrismaClient, SupplierCategory } from "@prisma/client";

// Sample verified suppliers and listings for local development and demos (PRD 11).
// Fictional businesses on phone numbers in the +23279900xxx range. Never run in production.

type SampleListing = {
  category: SupplierCategory;
  title: string;
  description: string;
  priceSle: number | null;
  unit: string | null;
  districts: string[] | "all";
  isSponsored?: boolean;
};

type SampleSupplier = {
  phone: string;
  legalName: string;
  regNumber: string;
  address: string;
  district: string;
  contactName: string;
  sellsAgrochemicals: boolean;
  whatsapp: boolean;
  listings: SampleListing[];
};

const SUPPLIERS: SampleSupplier[] = [
  {
    phone: "+23279900001",
    legalName: "Kenema Agro Inputs (Sample)",
    regNumber: "SAMPLE-0001",
    address: "12 Hangha Road, Kenema",
    district: "kenema",
    contactName: "Ibrahim Conteh",
    sellsAgrochemicals: true,
    whatsapp: true,
    listings: [
      { category: "SEEDS", title: "NERICA upland rice seed, 25 kg", description: "Certified NERICA rice seed for upland farms. Good germination. Ask about delivery to your chiefdom.", priceSle: 450, unit: "bag", districts: ["kenema", "kailahun", "bo"], isSponsored: true },
      { category: "FERTILISER", title: "NPK 15-15-15 fertiliser, 50 kg", description: "Balanced fertiliser for rice, maize and vegetables. Sealed bags.", priceSle: 1150, unit: "bag", districts: ["kenema", "kailahun", "kono", "bo"] },
      { category: "AGROCHEMICALS", title: "Herbicide for rice fields, 1 litre", description: "Registered selective herbicide. Read the label and talk to an extension officer before use.", priceSle: null, unit: null, districts: ["kenema"] },
    ],
  },
  {
    phone: "+23279900002",
    legalName: "Makeni Farm Tools Centre (Sample)",
    regNumber: "SAMPLE-0002",
    address: "4 Azzolini Highway, Makeni",
    district: "bombali",
    contactName: "Fatmata Sesay",
    sellsAgrochemicals: false,
    whatsapp: true,
    listings: [
      { category: "TOOLS", title: "Hoes, cutlasses and rakes", description: "Strong farm hand tools. Discount for farmer groups buying 10 or more.", priceSle: 85, unit: "piece", districts: ["bombali", "tonkolili", "karene", "port-loko"] },
      { category: "TOOLS", title: "Knapsack sprayer, 16 litre", description: "Manual sprayer with spare nozzle. Wash after each use.", priceSle: 650, unit: null, districts: ["bombali", "tonkolili", "koinadugu", "falaba"] },
      { category: "SEEDS", title: "Hybrid maize seed, 10 kg", description: "Early maturing maize seed for the rainy season.", priceSle: 380, unit: "bag", districts: ["bombali", "tonkolili", "koinadugu"] },
    ],
  },
  {
    phone: "+23279900003",
    legalName: "Bo Machinery Hire (Sample)",
    regNumber: "SAMPLE-0003",
    address: "21 Dambara Road, Bo",
    district: "bo",
    contactName: "Mohamed Kamara",
    sellsAgrochemicals: false,
    whatsapp: false,
    listings: [
      { category: "EQUIPMENT_HIRE", title: "Power tiller hire with operator", description: "Ploughing and harrowing for lowland rice. Book early before the rains.", priceSle: 900, unit: "day", districts: ["bo", "moyamba", "pujehun", "bonthe"] },
      { category: "MACHINERY", title: "Rice thresher, diesel", description: "Used rice thresher in good condition. Can demonstrate in Bo.", priceSle: 18500, unit: null, districts: "all" },
    ],
  },
  {
    phone: "+23279900004",
    legalName: "Freetown Seeds & Fertiliser (Sample)",
    regNumber: "SAMPLE-0004",
    address: "8 Kissy Road, Freetown",
    district: "western-area-urban",
    contactName: "Aminata Koroma",
    sellsAgrochemicals: false,
    whatsapp: true,
    listings: [
      { category: "SEEDS", title: "Vegetable seed packs: pepper, okra, tomato", description: "Small packs for home gardens and market gardens. Sold per pack.", priceSle: 35, unit: "pack", districts: ["western-area-urban", "western-area-rural", "port-loko"] },
      { category: "FERTILISER", title: "Urea fertiliser, 50 kg", description: "Nitrogen top-dressing for rice and maize.", priceSle: 980, unit: "bag", districts: "all" },
    ],
  },
];

export async function seedSampleSuppliers(db: PrismaClient) {
  const districts = await db.district.findMany({ select: { id: true, slug: true } });
  const districtId = (slug: string) => {
    const d = districts.find((x) => x.slug === slug);
    if (!d) throw new Error(`Unknown district ${slug}; seed reference data first`);
    return d.id;
  };

  let listingCount = 0;
  for (const s of SUPPLIERS) {
    const user = await db.user.upsert({
      where: { phone: s.phone },
      update: { role: "SUPPLIER", name: s.contactName },
      create: { phone: s.phone, role: "SUPPLIER", name: s.contactName },
    });
    const membership = await db.orgMember.findUnique({ where: { userId: user.id } });
    const orgData = {
      type: "SUPPLIER" as const,
      legalName: s.legalName,
      regNumber: s.regNumber,
      address: s.address,
      districtId: districtId(s.district),
      contactName: s.contactName,
      phone: s.phone,
      sellsAgrochemicals: s.sellsAgrochemicals,
      status: "APPROVED" as const,
      submittedAt: new Date(),
      verifiedAt: new Date(),
    };
    const org = membership
      ? await db.organisation.update({ where: { id: membership.orgId }, data: orgData })
      : await db.organisation.create({ data: { ...orgData, members: { create: { userId: user.id, role: "OWNER" } } } });

    // Recreate the sample listings so re-running the seed gives the same result.
    await db.supplierListing.deleteMany({ where: { orgId: org.id } });
    for (const l of s.listings) {
      const ids = l.districts === "all" ? districts.map((d) => d.id) : l.districts.map(districtId);
      await db.supplierListing.create({
        data: {
          orgId: org.id,
          category: l.category,
          title: l.title,
          description: l.description,
          priceMinor: l.priceSle === null ? null : l.priceSle * 100,
          unit: l.unit,
          contactPhone: s.phone,
          whatsappNumber: s.whatsapp ? s.phone : null,
          isSponsored: l.isSponsored ?? false,
          districts: { connect: ids.map((id) => ({ id })) },
        },
      });
      listingCount += 1;
    }
  }
  return { suppliers: SUPPLIERS.length, listings: listingCount };
}
