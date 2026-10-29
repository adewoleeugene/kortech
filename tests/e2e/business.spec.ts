import { type Browser, type Page, expect, test } from "@playwright/test";
import { newLocalPhone, readOtp, setRole, signInWithPhone } from "./helpers";

const PDF = { name: "certificate.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") };
const EXE_AS_PDF = { name: "virus.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ\x90\x00 nope") };

async function startBusinessSignUp(page: Page) {
  const phone = newLocalPhone();
  await page.goto("/");
  await page.getByRole("link", { name: "I run a business" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Phone number").fill(phone.local);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("6-digit code").fill(await readOtp(phone.e164));
  await page.getByRole("button", { name: "Sign in" }).click();
  // New business accounts skip farmer onboarding.
  await expect(page).toHaveURL(/\/register-business$/);
  return phone;
}

async function fillOrganisation(page: Page, legalName: string, opts: { agrochemicals: boolean }) {
  await page.getByRole("radio", { name: /Supplier/ }).check();
  if (opts.agrochemicals) await page.getByLabel("We sell agrochemicals (pesticides, herbicides)").check();
  await page.getByLabel("Registered business name").fill(legalName);
  await page.getByLabel("Business registration number").fill("SL-BR-2026-0042");
  await page.getByLabel("Business address").fill("4 Main Motor Road, Makeni");
  await page.getByLabel("District").selectOption({ label: "Bombali" });
  await page.getByLabel("Contact person").fill("Alhaji Kamara");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/business$/);
}

async function upload(page: Page, docLabel: string, file: typeof PDF) {
  const input = page.getByLabel(`${docLabel}: Choose file`);
  await input.setInputFiles(file);
  await page.locator("form", { has: input }).getByRole("button", { name: /^(Upload|Replace file)$/ }).click();
}

async function adminPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const phone = newLocalPhone();
  await signInWithPhone(page, phone);
  await setRole(phone.e164, "ADMIN");
  return page;
}

test("a supplier registers, uploads documents, and an admin approves it", async ({ page, browser, playwright }) => {
  await startBusinessSignUp(page);
  await fillOrganisation(page, "Makeni Agro Supplies", { agrochemicals: true });
  await expect(page.getByTestId("org-status")).toHaveText("Not submitted");

  // Can't submit before documents are uploaded.
  await page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(page.getByText("Upload all required documents first: Business registration certificate, Licence.")).toBeVisible();

  // Wrong file types are refused by content, not by name.
  await upload(page, "Business registration certificate", EXE_AS_PDF);
  await expect(page.getByText("Only PDF, JPG or PNG files are accepted.")).toBeVisible();

  await upload(page, "Business registration certificate", PDF);
  await expect(page.getByTestId("doc-REGISTRATION_CERTIFICATE")).toContainText("Uploaded: certificate.pdf");
  await upload(page, "Licence", { ...PDF, name: "dealer-licence.pdf" });
  await expect(page.getByTestId("doc-LICENCE")).toContainText("Uploaded: dealer-licence.pdf");

  await page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(page.getByTestId("org-status")).toHaveText("Under review");
  await expect(page.getByRole("button", { name: "Submit for verification" })).toHaveCount(0);

  // Admin reviews it.
  const admin = await adminPage(browser);
  await admin.goto("/admin");
  await admin.getByRole("link", { name: /Business verification/ }).click();
  await admin.getByRole("link", { name: /Makeni Agro Supplies/ }).click();
  const docHref = await admin.getByRole("link", { name: "Open" }).first().getAttribute("href");
  expect(docHref).toMatch(/^\/api\/documents\/\w+\?expires=\d+&sig=/);

  // Documents: admin yes; the business itself, signed-out visitors and stale links no.
  const asAdmin = await admin.request.get(docHref!);
  expect(asAdmin.status()).toBe(200);
  expect(asAdmin.headers()["content-type"]).toBe("application/pdf");
  expect((await page.request.get(docHref!)).status()).toBe(403);
  const anonymous = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL });
  expect((await anonymous.get(docHref!)).status()).toBe(401);
  expect((await admin.request.get(docHref!.replace(/sig=[^&]+/, "sig=forged"))).status()).toBe(403);
  // Nothing is reachable as a static file either.
  expect((await anonymous.get("/.data/e2e-private")).status()).toBe(404);
  await anonymous.dispose();

  await admin.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByTestId("org-status")).toHaveText("Verified");
  await expect(admin.getByText(/Decided by/)).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("org-status")).toHaveText("Verified");
});

test("a rejected business sees the reason, fixes it and resubmits", async ({ page, browser }) => {
  await startBusinessSignUp(page);
  await fillOrganisation(page, "Bombali Grain Traders", { agrochemicals: false });
  await upload(page, "Business registration certificate", PDF);
  await expect(page.getByTestId("doc-REGISTRATION_CERTIFICATE")).toContainText("Uploaded");
  await page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(page.getByTestId("org-status")).toHaveText("Under review");

  const admin = await adminPage(browser);
  await admin.goto("/admin/organisations");
  await admin.getByRole("link", { name: /Bombali Grain Traders/ }).click();
  await admin.getByLabel("Reason for rejection (sent to the business)").fill("short");
  await admin.getByRole("button", { name: "Reject" }).click();
  // The browser blocks a reason under 10 characters (the server checks it too; see organisation.test.ts).
  await expect(admin.getByTestId("org-status")).toHaveText("Under review");
  const reason = "The certificate is blurred. Please upload a clear scan.";
  await admin.getByLabel("Reason for rejection (sent to the business)").fill(reason);
  await admin.getByRole("button", { name: "Reject" }).click();
  await expect(admin.getByTestId("org-status")).toHaveText("Not approved");

  await page.reload();
  await expect(page.getByTestId("org-status")).toHaveText("Not approved");
  await expect(page.getByText(reason)).toBeVisible();
  await upload(page, "Business registration certificate", { ...PDF, name: "clear-scan.pdf" });
  await expect(page.getByTestId("doc-REGISTRATION_CERTIFICATE")).toContainText("clear-scan.pdf");
  await page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(page.getByTestId("org-status")).toHaveText("Under review");
});

test("an onboarded farmer can't register a business or open the verification queue", async ({ page }) => {
  await signInWithPhone(page, newLocalPhone());
  await page.getByLabel("Your name").fill("Isata Turay");
  await page.getByLabel("District").selectOption({ label: "Kono" });
  await page.getByLabel("Maize").check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/farmer$/);

  for (const path of ["/register-business", "/business", "/admin/organisations"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/forbidden$/);
  }
});

test("an agronomist can open the admin area but not the verification queue", async ({ page }) => {
  const phone = newLocalPhone();
  await signInWithPhone(page, phone);
  await setRole(phone.e164, "AGRONOMIST");
  await page.goto("/admin");
  await expect(page.getByText("Only admins can verify organisations.")).toBeVisible();
  await page.goto("/admin/organisations");
  await expect(page).toHaveURL(/\/forbidden$/);
});
