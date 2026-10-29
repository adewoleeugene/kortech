import { expect, test } from "@playwright/test";
import { newLocalPhone, readOtp, setRole, signInWithPhone } from "./helpers";

test("a new farmer signs up with a phone code and reaches the dashboard", async ({ page }) => {
  const phone = newLocalPhone();
  await page.goto("/");
  await page.getByRole("link", { name: "I am a farmer" }).click();
  await expect(page.getByRole("heading", { name: "Sign in with your phone" })).toBeVisible();

  await page.getByLabel("Phone number").fill(phone.local);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText(/We sent a 6-digit code to 078/)).toBeVisible();
  // The number being verified is never put in the URL.
  expect(page.url()).not.toContain(phone.local.slice(1));

  await page.getByLabel("6-digit code").fill(await readOtp(phone.e164));
  await page.getByRole("button", { name: "Sign in" }).click();

  // First sign-in goes to onboarding.
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Your name").fill("Fatmata Kamara");
  await page.getByLabel("District").selectOption({ label: "Bo" });
  await page.getByLabel("Chiefdom (optional)").selectOption({ label: "Kakua" });
  await page.getByLabel("Rice").check();
  await page.getByLabel("Cassava").check();
  await page.getByLabel("Farm size (optional)").fill("3");
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page).toHaveURL(/\/farmer$/);
  await expect(page.getByRole("heading", { name: "Welcome, Fatmata Kamara" })).toBeVisible();
  await expect(page.getByText("Kakua")).toBeVisible();
  await expect(page.getByText("Cassava, Rice")).toBeVisible();
  await expect(page.getByText("3 Acres")).toBeVisible();

  // Signing in again skips onboarding.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await signInWithPhone(page, phone);
  await expect(page).toHaveURL(/\/farmer$/);
});

test("onboarding shows field errors and keeps the farmer on the form", async ({ page }) => {
  await signInWithPhone(page, newLocalPhone());
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText("Enter your name (at least 2 letters).")).toBeVisible();
  await expect(page.getByText("Choose your district.")).toBeVisible();
  await expect(page.getByText("Choose at least one crop.")).toBeVisible();
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("a farmer cannot open admin or business routes", async ({ page }) => {
  const phone = newLocalPhone();
  await signInWithPhone(page, phone);
  await expect(page).toHaveURL(/\/onboarding$/);

  for (const path of ["/admin", "/business"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByRole("heading", { name: "You can't open this page" })).toBeVisible();
  }
});

test("an admin can open admin routes but not the farmer area", async ({ page }) => {
  const phone = newLocalPhone();
  await signInWithPhone(page, phone);
  await setRole(phone.e164, "ADMIN");

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin console" })).toBeVisible();
  await page.goto("/farmer");
  await expect(page).toHaveURL(/\/forbidden$/);
});

test("signed-out visitors to a protected page are sent to sign in", async ({ page }) => {
  await page.goto("/farmer");
  await expect(page).toHaveURL(/\/login\?next=%2Ffarmer$/);

  const phone = newLocalPhone();
  await page.getByLabel("Phone number").fill(phone.local);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("6-digit code").fill(await readOtp(phone.e164));
  await page.getByRole("button", { name: "Sign in" }).click();
  // New farmers still need to finish onboarding first.
  await expect(page).toHaveURL(/\/onboarding$/);
});

test("a wrong code shows how many tries are left", async ({ page }) => {
  const phone = newLocalPhone();
  await page.goto("/login");
  await page.getByLabel("Phone number").fill(phone.local);
  await page.getByRole("button", { name: "Send code" }).click();
  const code = await readOtp(phone.e164);
  await page.getByLabel("6-digit code").fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That code is not correct. You have 4 tries left.")).toBeVisible();
});

test("an invalid phone number is rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Phone number").fill("12345");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText(/Enter a valid Sierra Leone phone number/)).toBeVisible();
});
