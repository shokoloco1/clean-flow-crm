import { test, expect } from "@playwright/test";

test.describe("Auth page", () => {
  test("shows login form with email and password fields", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation error for empty form submission", async ({ page }) => {
    await page.goto("/auth");
    // Both fields are required — submitting empty should not navigate away
    await page.getByRole("button", { name: /sign in/i }).click();
    // We should still be on the auth page
    await expect(page).toHaveURL(/\/auth/);
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/auth");
    await page.locator("#login-email").fill("invalid@example.com");
    await page.locator("#login-password").fill("wrongpassword123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show an error toast or message
    await expect(page.getByText(/invalid|incorrect|error|failed/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("has forgot password link", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText(/forgot password/i)).toBeVisible();
  });
});
