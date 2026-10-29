// Promote an existing user, e.g. the first admin:
//   npm run user:set-role -- 076123456 ADMIN
// The user must have signed in once so the account exists.
import { PrismaClient, Role } from "@prisma/client";
import { normalizeSierraLeonePhone } from "../lib/phone";

const [rawPhone, rawRole] = process.argv.slice(2);
const roles = Object.values(Role);

async function main() {
  const phone = rawPhone ? normalizeSierraLeonePhone(rawPhone) : null;
  if (!phone || !roles.includes(rawRole as Role)) {
    console.error(`Usage: npm run user:set-role -- <phone> <${roles.join("|")}>`);
    process.exitCode = 1;
    return;
  }
  const db = new PrismaClient();
  try {
    const user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      console.error(`No user with phone ${phone}. Sign in once with that number first.`);
      process.exitCode = 1;
      return;
    }
    await db.user.update({ where: { phone }, data: { role: rawRole as Role } });
    // Role changes take effect on their next request; sessions stay valid.
    console.log(`${phone}: ${user.role} -> ${rawRole}`);
  } finally {
    await db.$disconnect();
  }
}

main();
