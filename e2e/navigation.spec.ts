import { test, expect } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe("Authenticated navigation", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "E2E credentials not configured");

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.locator("#login-email").fill(E2E_EMAIL!);
    await page.locator("#login-password").fill(E2E_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    // Wait for redirect to admin dashboard
    await page.waitForURL("**/admin", { timeout: 15_000 });
  });

  test("loads admin dashboard", async ({ page }) => {
    await expect(page.getByText(/dashboard|today/i).first()).toBeVisible();
  });

  test("navigates to clients page", async ({ page }) => {
    await page.goto("/admin/clients");
    await expect(page.getByText(/client/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigates to staff page", async ({ page }) => {
    await page.goto("/admin/staff");
    await expect(page.getByText(/staff|team/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigates to invoices page", async ({ page }) => {
    await page.goto("/admin/invoices");
    await expect(page.getByText(/invoice/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
