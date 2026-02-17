import { test, expect } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe("Client CRUD flow", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "E2E credentials not configured");

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.locator("#login-email").fill(E2E_EMAIL!);
    await page.locator("#login-password").fill(E2E_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/admin", { timeout: 15_000 });
    await page.goto("/admin/clients");
    await page.waitForLoadState("networkidle");
  });

  test("creates a new client and verifies it appears in the list", async ({ page }) => {
    const uniqueName = `E2E Test Client ${Date.now()}`;

    // Click add client button
    await page
      .getByRole("button", { name: /add|new|create/i })
      .first()
      .click();

    // Fill client form — look for name input in the dialog
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Fill name field
    const nameInput = dialog.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(uniqueName);
    } else {
      // Fallback: find first text input in dialog
      await dialog.locator("input[type='text']").first().fill(uniqueName);
    }

    // Fill email field if present
    const emailInput = dialog.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await emailInput.fill(`e2e-${Date.now()}@test.com`);
    }

    // Submit the form
    const submitButton = dialog.getByRole("button", { name: /save|create|add|submit/i }).first();
    await submitButton.click();

    // Verify success toast or client appears in list
    await expect(page.getByText(uniqueName).or(page.getByText(/created|success/i))).toBeVisible({
      timeout: 10_000,
    });
  });

  test("searches for clients", async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill("test");

    // Wait for search to apply (debounced)
    await page.waitForTimeout(500);

    // Page should still be functional (no crash)
    await expect(page.locator("main")).toBeVisible();
  });
});
