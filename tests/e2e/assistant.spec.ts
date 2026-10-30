import { type Page, expect, test } from "@playwright/test";
import { addQuestionsToday, newLocalPhone, setRole, signInWithPhone } from "./helpers";

async function onboardFarmer(page: Page) {
  const phone = newLocalPhone();
  await signInWithPhone(page, phone);
  await page.getByLabel("Your name").fill("Mariama Conteh");
  await page.getByLabel("District").selectOption({ label: "Bo" });
  await page.getByLabel("Rice").check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/farmer$/);
  return phone;
}

async function ask(page: Page, question: string) {
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Ask" }).click();
}

test("a farmer asks a question, gets an answer citing the guide, rates it and reports it; a reviewer corrects it", async ({ page, browser }) => {
  await onboardFarmer(page);
  await page.getByRole("link", { name: /Ask a farming question/ }).click();
  await expect(page.getByText("Your questions are saved so Kortech staff can check the quality of answers.")).toBeVisible();
  await expect(page.getByTestId("remaining")).toHaveText("20 of 20 questions left today");

  await ask(page, "Birds are eating my rice. What can I do?");
  const answer = page.getByTestId("answer").last();
  await expect(answer).toContainText("[1]");
  // The cited guide section links to the right place in the guide.
  const source = answer.getByTestId("sources").getByRole("link");
  await expect(source).toHaveText("[1] Rice: Pests");
  await expect(source).toHaveAttribute("href", "/guides/rice#pests");
  await expect(page.getByTestId("remaining")).toHaveText("19 of 20 questions left today");

  // Follow-up in the same conversation.
  await ask(page, "When should I harvest it?");
  await expect(page.getByTestId("conversation").locator(":scope > li")).toHaveCount(4);

  // Rate and report the first answer.
  const first = page.getByTestId("answer").first();
  await first.getByRole("button", { name: "Not helpful" }).click();
  await expect(page.getByTestId("answer").first().getByRole("button", { name: "Not helpful" })).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("answer").first().getByText("Report a problem").click();
  await page.getByTestId("answer").first().getByLabel("What is wrong with this answer? (optional)").fill("Scarecrows don't work on my farm");
  await page.getByTestId("answer").first().getByRole("button", { name: "Send report" }).click();
  await expect(page.getByTestId("answer").first()).toContainText("Reported. Kortech staff will check this answer.");

  // An agronomist sees it in the review queue and adds a correction.
  const reviewerContext = await browser.newContext();
  const reviewer = await reviewerContext.newPage();
  const reviewerPhone = newLocalPhone();
  await signInWithPhone(reviewer, reviewerPhone);
  await setRole(reviewerPhone.e164, "AGRONOMIST", "Dr. Fatu Kamara");
  await reviewer.goto("/admin");
  await reviewer.getByRole("link", { name: /AI answer review/ }).click();
  const item = reviewer.getByTestId("review-item").filter({ hasText: "Birds are eating my rice" });
  await expect(item).toContainText("Reported by the farmer");
  await expect(item).toContainText("Farmer's note: Scarecrows don't work on my farm");
  await expect(item).toContainText("Farmer rating: Not helpful");
  await item.getByLabel("Correction for the farmer (optional)").fill("Guard the field early in the morning and evening when birds feed, and harvest on time.");
  await item.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(reviewer.getByTestId("review-item").filter({ hasText: "Birds are eating my rice" })).toHaveCount(0);
  await reviewerContext.close();

  // The farmer sees the correction under the original answer.
  await page.reload();
  await expect(page.getByTestId("answer").first().getByTestId("correction")).toContainText("Guard the field early in the morning");
});

test("a dose request for a hazardous pesticide gets the safe reply", async ({ page }) => {
  await onboardFarmer(page);
  await page.goto("/farmer/assistant");
  await ask(page, "How much paraquat should I mix in my knapsack sprayer?");
  const answer = page.getByTestId("answer").last();
  await expect(answer).toContainText("I can't give doses or mixing rates for paraquat");
  await expect(answer).toContainText("Talk to your local extension officer");
  await expect(answer).not.toContainText(/\d+\s*ml/);
});

test("the daily limit stops questions after 20", async ({ page }) => {
  const phone = await onboardFarmer(page);
  await addQuestionsToday(phone.e164, 19);
  await page.goto("/farmer/assistant?new=1");
  await expect(page.getByTestId("remaining")).toHaveText("1 of 20 questions left today");
  await ask(page, "One last question about rice planting?");
  await expect(page.getByTestId("remaining")).toHaveText("0 of 20 questions left today");
  await expect(page.getByText("You have used all 20 questions for today.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask" })).toHaveCount(0);
  await expect(page.getByLabel("Your question")).toBeDisabled();
});

test("only farmers can use the assistant", async ({ page }) => {
  const phone = newLocalPhone();
  await signInWithPhone(page, phone);
  await setRole(phone.e164, "SUPPLIER");
  await page.goto("/farmer/assistant");
  await expect(page).toHaveURL(/\/forbidden$/);
});
