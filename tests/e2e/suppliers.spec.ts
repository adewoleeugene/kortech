import { type Page, expect, test } from "@playwright/test";
import { makeApprovedSupplier, newLocalPhone, setRole, signInWithPhone } from "./helpers";

// A tiny valid PNG (1x1), so next/image can resize it.
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function onboardFarmer(page: Page, district: string) {
  await signInWithPhone(page, newLocalPhone());
  await page.getByLabel("Your name").fill("Kadiatu Bangura");
  await page.getByLabel("District").selectOption({ label: district });
  await page.getByLabel("Rice").check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/farmer$/);
}

test("an approved supplier lists a product and a farmer finds and contacts them", async ({ page, browser }) => {
  // Supplier creates a listing.
  const supplierPhone = newLocalPhone();
  await signInWithPhone(page, supplierPhone);
  await makeApprovedSupplier(supplierPhone.e164, "Tongo Field Seeds Ltd");
  await page.goto("/business");
  await page.getByRole("link", { name: "Manage product listings" }).click();
  await page.getByRole("link", { name: "+ Add a listing" }).click();

  await page.getByLabel("Category").selectOption({ label: "Seeds" });
  await page.getByLabel("Product name").fill("Tongo groundnut seed, 20 kg");
  await page.getByLabel("Description").fill("Clean groundnut seed for the coming season. Delivery in Kenema.");
  await page.getByLabel("Price in Leones (optional)").fill("320");
  await page.getByLabel("Per (optional)").fill("bag");
  // Kenema is pre-selected (the organisation's district); add Kono.
  await page.getByLabel("Kono").check();
  await page.getByLabel("WhatsApp number (optional)").fill(supplierPhone.local);
  await page.getByLabel("Photos (optional)").setInputFiles({ name: "seed.png", mimeType: "image/png", buffer: PNG_1PX });
  await page.getByRole("button", { name: "Save listing" }).click();
  await expect(page).toHaveURL(/\/business\/listings$/);
  await expect(page.getByTestId("own-listing").filter({ hasText: "Tongo groundnut seed" })).toContainText("Active");

  // A farmer in Kono finds it; the district filter starts on their own district.
  const farmerContext = await browser.newContext();
  const farmer = await farmerContext.newPage();
  await onboardFarmer(farmer, "Kono");
  await farmer.getByRole("link", { name: /Find suppliers/ }).click();
  await expect(farmer.getByLabel("District")).toHaveValue(/.+/);
  await expect(farmer.getByLabel("District").locator("option:checked")).toHaveText("Kono");

  await farmer.getByLabel("Search").fill("groundnut");
  await farmer.getByRole("button", { name: "Search" }).click();
  const card = farmer.getByRole("article").filter({ hasText: "Tongo groundnut seed" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("SLE 320 per bag");
  await expect(card).toContainText("Tongo Field Seeds Ltd");
  await expect(card.getByRole("link", { name: "Call" })).toHaveAttribute("href", `tel:${supplierPhone.e164}`);
  await expect(card.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", new RegExp(`^https://wa\\.me/${supplierPhone.e164.slice(1)}\\?text=`));

  // The photo is served (resized) and the detail page works.
  const img = card.locator("img");
  await expect(img).toHaveAttribute("src", /\/_next\/image\?url=%2Fmedia%2Flisting-photos/);
  await card.getByRole("link", { name: "Tongo groundnut seed, 20 kg" }).click();
  await expect(farmer.getByRole("heading", { name: "Tongo groundnut seed, 20 kg" })).toBeVisible();
  await expect(farmer.getByText("Clean groundnut seed for the coming season.")).toBeVisible();

  // Filters: wrong district / category hide it.
  await farmer.goto("/suppliers?q=groundnut&district=all&category=TOOLS");
  await expect(farmer.getByText("No suppliers found.")).toBeVisible();
  await farmerContext.close();

  // The supplier turns it off: it leaves the directory.
  await page.getByTestId("own-listing").filter({ hasText: "Tongo groundnut seed" }).getByRole("button", { name: "Turn off" }).click();
  await expect(page.getByTestId("own-listing").filter({ hasText: "Tongo groundnut seed" })).toContainText("Turned off");
  await page.goto("/suppliers?q=groundnut&district=all");
  await expect(page.getByTestId("result-count")).toHaveText("0 results");
});

test("visitors can browse without signing in and see only verified suppliers", async ({ page }) => {
  await page.goto("/suppliers");
  // Every image on the page actually loads (guards the next/image allow-list in next.config.ts).
  await page.waitForLoadState("load");
  const broken = await page.locator("img").evaluateAll((imgs) => imgs.filter((i) => !(i as HTMLImageElement).naturalWidth).map((i) => (i as HTMLImageElement).src));
  expect(broken).toEqual([]);
  await expect(page.getByLabel("District")).toHaveValue("all");
  await expect(page.getByTestId("result-count")).toHaveText("10 results");
  // Sponsored listings come first and are labelled.
  const first = page.getByRole("article").first();
  await expect(first).toContainText("Sponsored");
  await expect(first).toContainText("NERICA upland rice seed");

  await page.getByLabel("Category").selectOption({ label: "Fertiliser" });
  await page.getByLabel("District").selectOption({ label: "Pujehun" });
  await page.getByRole("button", { name: "Search" }).click();
  // Only the urea listing serves all districts, Pujehun included.
  await expect(page.getByTestId("result-count")).toHaveText("1 result");
  await expect(page.getByRole("article")).toContainText("Urea fertiliser");
  await expect(page.getByRole("article")).toContainText("Serves all districts");
});

test("an admin hides a listing and marks one as sponsored", async ({ page }) => {
  const phone = newLocalPhone();
  await signInWithPhone(page, phone);
  await setRole(phone.e164, "ADMIN");
  await page.goto("/admin/listings");

  const thresher = page.getByTestId("admin-listing").filter({ hasText: "Rice thresher" });
  await thresher.getByRole("button", { name: "Hide" }).click();
  await expect(thresher).toContainText("Hidden by Kortech");
  await page.goto("/suppliers?q=thresher&district=all");
  await expect(page.getByTestId("result-count")).toHaveText("0 results");

  await page.goto("/admin/listings");
  await thresher.getByRole("button", { name: "Restore" }).click();
  const hoes = page.getByTestId("admin-listing").filter({ hasText: "Hoes, cutlasses" });
  await hoes.getByRole("button", { name: "Mark sponsored" }).click();
  await expect(hoes.getByRole("button", { name: "Remove sponsored" })).toBeVisible();
  await page.goto("/suppliers?q=hoes&district=all");
  await expect(page.getByRole("article")).toContainText("Sponsored");
  // Leave the sample data as it was for other tests.
  await page.goto("/admin/listings");
  await hoes.getByRole("button", { name: "Remove sponsored" }).click();
  await expect(hoes.getByRole("button", { name: "Mark sponsored" })).toBeVisible();
});

// PRD 7 / Milestone 4: listing pages load fast on throttled 3G, on a low-end phone.
test.describe("on a slow 3G connection and a low-end phone", () => {
  const SLOW_3G = { offline: false, latency: 300, downloadThroughput: (750 * 1024) / 8, uploadThroughput: (250 * 1024) / 8 };
  const JS_BUDGET_BYTES = 300 * 1024;

  for (const path of ["/suppliers", "/suppliers?category=SEEDS&district=all"]) {
    test(`${path} is usable within 5 seconds and ships under 300 KB of JavaScript`, async ({ page }) => {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", SLOW_3G);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

      let jsBytes = 0;
      const scriptRequests = new Set<string>();
      cdp.on("Network.responseReceived", (e) => {
        if (e.type === "Script") scriptRequests.add(e.requestId);
      });
      cdp.on("Network.loadingFinished", (e) => {
        if (scriptRequests.has(e.requestId)) jsBytes += e.encodedDataLength;
      });

      const started = Date.now();
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("article").first()).toBeVisible();
      const usableMs = Date.now() - started;
      await page.waitForLoadState("load");
      const loadMs = Date.now() - started;

      test.info().annotations.push({ type: "3G timing", description: `usable ${usableMs} ms, load ${loadMs} ms, JS ${Math.round(jsBytes / 1024)} KB` });
      expect(usableMs).toBeLessThan(5_000);
      expect(loadMs).toBeLessThan(10_000);
      expect(jsBytes).toBeLessThan(JS_BUDGET_BYTES);
    });
  }
});
