import { type Page, expect, test } from "@playwright/test";
import { newLocalPhone, setRole, signInWithPhone } from "./helpers";

async function onboardFarmer(page: Page, district: string, crop: string) {
  await signInWithPhone(page, newLocalPhone());
  await page.getByLabel("Your name").fill("Sahr Fomba");
  await page.getByLabel("District").selectOption({ label: district });
  await page.getByLabel(crop).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/farmer$/);
}

// Waits until the service worker controls the page, so the next load goes through it.
async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    }
  });
}

test("the forecast shows for the farmer's district, with farming tips", async ({ page }) => {
  await onboardFarmer(page, "Bo", "Rice");

  // Dashboard card. The mock forecast has 28 mm of rain on day 3.
  await expect(page.getByRole("heading", { name: "Weather in Bo" })).toBeVisible();
  await expect(page.getByTestId("weather-tips")).toContainText("Heavy rain expected");

  await page.getByRole("link", { name: /See 7-day forecast/ }).click();
  await expect(page).toHaveURL(/\/weather\?district=bo$/);
  await expect(page.getByRole("heading", { name: "7-day forecast for Bo" })).toBeVisible();
  await expect(page.getByTestId("forecast-days").getByRole("listitem")).toHaveCount(7);
  await expect(page.getByTestId("forecast-days")).toContainText("Today");
  await expect(page.getByTestId("weather-tips")).toContainText("(28 mm). Delay fertiliser and spraying");

  // /weather with no district sends a signed-in farmer to their own district.
  await page.goto("/weather");
  await expect(page).toHaveURL(/\/weather\?district=bo$/);

  // Anyone can switch district.
  await page.getByLabel("District").selectOption({ label: "Kailahun" });
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page.getByRole("heading", { name: "7-day forecast for Kailahun" })).toBeVisible();
});

test("guide sections reach farmers only after review, with the reviewer shown", async ({ page, browser }) => {
  // Before review: sample text is labelled.
  await page.goto("/guides/rice");
  const soil = page.getByTestId("guide-section").filter({ has: page.getByRole("heading", { name: "Soil and land" }) });
  await expect(soil).toContainText("Not yet reviewed by an agronomist");

  // An agronomist edits the section: it goes back to draft and disappears for farmers.
  const reviewerContext = await browser.newContext();
  const reviewer = await reviewerContext.newPage();
  const phone = newLocalPhone();
  await signInWithPhone(reviewer, phone);
  await setRole(phone.e164, "AGRONOMIST", "Dr. Fatu Kamara");
  await reviewer.goto("/admin");
  await reviewer.getByRole("link", { name: "Crop guide editor" }).click();
  await reviewer.getByRole("link", { name: /^Rice/ }).click();
  await reviewer.getByTestId("section-SOIL").getByRole("link").click();
  await reviewer.getByLabel("Text").fill("Choose land that does not flood for long.\n\n- Build bunds in swamps.\n- Keep crop residue on upland soil.");
  await reviewer.getByRole("button", { name: "Save draft" }).click();
  await expect(reviewer.getByText("Saved. Review and publish when it is ready.")).toBeVisible();
  await reviewer.reload();
  await expect(reviewer.getByTestId("guide-status")).toHaveText("Draft, not published");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Soil and land" })).toHaveCount(0);

  // Reviewed and published: farmers see it, with who reviewed it and no sample warning.
  await reviewer.getByRole("button", { name: "Mark reviewed and publish" }).click();
  await expect(reviewer.getByTestId("guide-status")).toHaveText("Published");
  await reviewerContext.close();

  await page.reload();
  await expect(soil).toContainText("Build bunds in swamps.");
  await expect(soil.getByRole("listitem")).toHaveCount(2);
  await expect(soil).toContainText(/Reviewed by Dr\. Fatu Kamara, /);
  await expect(soil).not.toContainText("Not yet reviewed");
});

test("guides and the last forecast open offline after the first visit", async ({ page, context }) => {
  // First visits, online. The service worker installs, then saves pages as they load.
  await page.goto("/guides/maize");
  await waitForServiceWorker(page);
  await page.reload();
  await page.goto("/weather?district=kono");
  await expect(page.getByRole("heading", { name: "7-day forecast for Kono" })).toBeVisible();

  await context.setOffline(true);

  await page.goto("/guides/maize");
  await expect(page.getByRole("heading", { name: "Maize", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "When to plant" })).toBeVisible();
  await expect(page.getByText("You are offline. Showing what is saved on this phone.")).toBeVisible();

  await page.goto("/weather?district=kono");
  await expect(page.getByRole("heading", { name: "7-day forecast for Kono" })).toBeVisible();
  await expect(page.getByTestId("forecast-days").getByRole("listitem")).toHaveCount(7);

  // A guide never opened before shows the offline page instead of a browser error.
  await page.goto("/guides/cocoa");
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();

  // Private pages are never saved.
  const cache = await page.evaluate(async () => {
    const keys: string[] = [];
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) keys.push(new URL(req.url).pathname);
    return keys;
  });
  expect(cache.filter((p) => /^\/(farmer|business|admin|login)/.test(p))).toEqual([]);

  await context.setOffline(false);
});
