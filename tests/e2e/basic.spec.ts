import { test, expect, Page } from '@playwright/test';

test.describe("Basic Tests", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    page.goto('');
  });

  test.afterAll(async () => {
    await page.close();
  })

  test('has title', async () => {
    // await page.goto('');
    await expect(page).toHaveTitle(/GH Automation Setup and Testing Page/);
  });

  test('has text', async () => {
    // await page.goto('');
    await expect(page.getByTestId('dummy-text')).toHaveText(/This is a dummy test page/);
  });

  test('submit button is disabled', async () => {
    const submitBtn = page.getByTestId('test-btn').getByText(/[Ss]ubmit/)
    await expect(submitBtn).toBeDisabled();
  });

  test('clicking on test button displays alert', async () => {
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('Test Message');
      await dialog.accept();
    });
    await page.getByTestId('test-btn').getByText(/[Tt]est/).click();
  });

});
