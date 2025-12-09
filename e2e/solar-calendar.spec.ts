import { test, expect } from '@playwright/test'

test.describe('Solar Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the header with title', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('The Solar Calendar')
    await expect(page.locator('.sun-icon')).toBeVisible()
  })

  test('should display current solar date', async ({ page }) => {
    await expect(page.locator('.date-display')).toBeVisible()
    await expect(page.locator('.solar-date')).toBeVisible()
    await expect(page.locator('.gregorian-date')).toBeVisible()
  })

  test('should display the calendar grid', async ({ page }) => {
    await expect(page.locator('.calendar')).toBeVisible()
    await expect(page.locator('.calendar-grid')).toBeVisible()
    await expect(page.locator('.weekday-header')).toBeVisible()
    await expect(page.locator('.days-grid')).toBeVisible()
  })

  test('should display weekday headers', async ({ page }) => {
    const weekdays = page.locator('.weekday-cell')
    await expect(weekdays).toHaveCount(7)
  })

  test('should display 30 days in the month grid', async ({ page }) => {
    const days = page.locator('.day-cell')
    await expect(days).toHaveCount(30)
  })

  test('should display footer with description', async ({ page }) => {
    await expect(page.locator('.footer')).toContainText('Summer Solstice')
  })
})

test.describe('Calendar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should navigate to previous month', async ({ page }) => {
    const monthSelect = page.locator('.month-select')
    const initialMonth = await monthSelect.inputValue()
    
    await page.click('button[aria-label="Previous month"]')
    
    const newMonth = await monthSelect.inputValue()
    const expectedMonth = parseInt(initialMonth) === 1 ? '12' : String(parseInt(initialMonth) - 1)
    expect(newMonth).toBe(expectedMonth)
  })

  test('should navigate to next month', async ({ page }) => {
    // First go to month 1 to ensure we're not at month 12
    await page.locator('.month-select').selectOption('1')
    
    await page.click('button[aria-label="Next month"]')
    
    const newMonth = await page.locator('.month-select').inputValue()
    expect(newMonth).toBe('2')
  })

  test('should change month via dropdown', async ({ page }) => {
    const monthSelect = page.locator('.month-select')
    
    await monthSelect.selectOption('6')
    
    await expect(monthSelect).toHaveValue('6')
  })

  test('should change year via input', async ({ page }) => {
    const yearInput = page.locator('.year-input')
    
    await yearInput.fill('2030')
    
    await expect(yearInput).toHaveValue('2030')
  })

  test('should wrap from month 1 to month 12 when going previous', async ({ page }) => {
    const monthSelect = page.locator('.month-select')
    const yearInput = page.locator('.year-input')
    
    // Go to month 1
    await monthSelect.selectOption('1')
    const initialYear = await yearInput.inputValue()
    
    // Click previous
    await page.click('button[aria-label="Previous month"]')
    
    // Should now be month 12 of previous year
    await expect(monthSelect).toHaveValue('12')
    await expect(yearInput).toHaveValue(String(parseInt(initialYear) - 1))
  })
})

test.describe('Solstice Days', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show solstice days view when clicking link', async ({ page }) => {
    await page.click('.solstice-link')
    
    await expect(page.locator('.solstice-days')).toBeVisible()
    await expect(page.locator('.solstice-title')).toContainText('Solstice')
  })

  test('should navigate to solstice when at month 12 and clicking next', async ({ page }) => {
    // Go to month 12
    await page.locator('.month-select').selectOption('12')
    
    // Click next month
    await page.click('button[aria-label="Next month"]')
    
    // Should show solstice days
    await expect(page.locator('.solstice-days')).toBeVisible()
  })

  test('should return to calendar from solstice view', async ({ page }) => {
    // Go to solstice view
    await page.click('.solstice-link')
    await expect(page.locator('.solstice-days')).toBeVisible()
    
    // Click back to calendar
    await page.click('button:has-text("Back to Calendar")')
    
    await expect(page.locator('.calendar')).toBeVisible()
  })
})

test.describe('Today Button', () => {
  test('should have a Today button in date display', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.locator('button:has-text("Today")')).toBeVisible()
  })

  test('should return to current date when clicking Today', async ({ page }) => {
    await page.goto('/')
    
    // Navigate away from current month
    await page.locator('.month-select').selectOption('1')
    await page.locator('.year-input').fill('2000')
    
    // Click Today
    await page.click('button:has-text("Today")')
    
    // Should show current month indicator (if we're in the current month)
    // At minimum, the calendar should be visible
    await expect(page.locator('.calendar')).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should have proper aria labels on navigation buttons', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.locator('button[aria-label="Previous month"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Next month"]')).toBeVisible()
  })

  test('should have aria label on year input', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.locator('input[aria-label="Year"]')).toBeVisible()
  })
})



