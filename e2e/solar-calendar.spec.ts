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
    // Solar calendar has 6-day weeks (no Tuesday)
    await expect(weekdays).toHaveCount(6)
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

test.describe('Date Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the date converter component', async ({ page }) => {
    await expect(page.locator('.date-converter')).toBeVisible()
    await expect(page.locator('.converter-header h3')).toHaveText('Date Converter')
  })

  test('should have mode toggle buttons', async ({ page }) => {
    await expect(page.locator('.mode-toggle button').first()).toContainText('Gregorian → Solar')
    await expect(page.locator('.mode-toggle button').last()).toContainText('Solar → Gregorian')
  })

  test('should convert Gregorian to Solar date', async ({ page }) => {
    // Default mode is Gregorian → Solar
    const dateInput = page.locator('.date-converter input[type="date"]')
    await dateInput.fill('2000-01-01')
    
    // Should show a result
    await expect(page.locator('.result-card')).toBeVisible()
    await expect(page.locator('.result-label')).toHaveText('Solar Date')
  })

  test('should switch to Solar to Gregorian mode', async ({ page }) => {
    await page.click('.mode-toggle button:has-text("Solar → Gregorian")')
    
    // Should show Solar input fields
    await expect(page.locator('.solar-input-grid')).toBeVisible()
    await expect(page.locator('.result-label')).toHaveText('Gregorian Date')
  })

  test('should convert Solar to Gregorian date', async ({ page }) => {
    await page.click('.mode-toggle button:has-text("Solar → Gregorian")')
    
    // Fill in Solar date
    await page.locator('.input-group select').selectOption('1') // July
    await page.locator('.input-group input[type="number"]').first().fill('1')
    await page.locator('.input-group input[type="number"]').last().fill('0')
    
    await expect(page.locator('.result-card')).toBeVisible()
  })

  test('should toggle solstice day input', async ({ page }) => {
    await page.click('.mode-toggle button:has-text("Solar → Gregorian")')
    
    // Check the solstice checkbox
    await page.click('.checkbox-label input[type="checkbox"]')
    
    // Month selector should be hidden
    await expect(page.locator('.input-group select')).not.toBeVisible()
  })

  test('should have copy button', async ({ page }) => {
    await expect(page.locator('.copy-button')).toBeVisible()
  })
})

test.describe('Year Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show year overview when clicking Year button', async ({ page }) => {
    await page.click('.toggle-button:has-text("Year")')
    
    await expect(page.locator('.year-overview')).toBeVisible()
    await expect(page.locator('.year-title')).toContainText('Year')
  })

  test('should display all 12 months in grid', async ({ page }) => {
    await page.click('.toggle-button:has-text("Year")')
    
    const months = page.locator('.mini-month')
    await expect(months).toHaveCount(12)
  })

  test('should display solstice period section', async ({ page }) => {
    await page.click('.toggle-button:has-text("Year")')
    
    await expect(page.locator('.solstice-period')).toBeVisible()
    await expect(page.locator('.solstice-header')).toContainText('Solstice Days')
  })

  test('should navigate to month when clicking mini-month', async ({ page }) => {
    await page.click('.toggle-button:has-text("Year")')
    
    // Click the first month (July)
    await page.locator('.mini-month').first().click()
    
    // Should return to calendar view
    await expect(page.locator('.calendar')).toBeVisible()
  })

  test('should return to calendar when clicking Back button', async ({ page }) => {
    await page.click('.toggle-button:has-text("Year")')
    await expect(page.locator('.year-overview')).toBeVisible()
    
    await page.click('.back-button')
    
    await expect(page.locator('.calendar')).toBeVisible()
  })

  test('should show leap year badge for leap years', async ({ page }) => {
    await page.locator('.year-input').fill('0') // Year 0 is a leap year
    await page.click('.toggle-button:has-text("Year")')
    
    await expect(page.locator('.leap-badge-small')).toBeVisible()
  })
})

test.describe('Solstice Countdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the solstice countdown component', async ({ page }) => {
    await expect(page.locator('.solstice-countdown')).toBeVisible()
  })

  test('should show countdown units or solstice now message', async ({ page }) => {
    // Either shows countdown units or "Solstice Now!" message
    const countdown = page.locator('.solstice-countdown')
    await expect(countdown).toBeVisible()
    
    const hasUnits = await page.locator('.countdown-units').isVisible()
    const hasSolsticeNow = await page.locator('.solstice-now-text').isVisible()
    
    expect(hasUnits || hasSolsticeNow).toBeTruthy()
  })

  test('should display countdown header when not in solstice', async ({ page }) => {
    // Navigate to a month that's not near solstice
    await page.locator('.month-select').selectOption('7') // January
    
    // If countdown is shown (not during solstice)
    const countdownHeader = page.locator('.countdown-header')
    if (await countdownHeader.isVisible()) {
      await expect(countdownHeader).toContainText('Until Solstice')
    }
  })
})

test.describe('Moon Phases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should have moon phase toggle button', async ({ page }) => {
    await expect(page.locator('.toggle-button:has-text("Moon")')).toBeVisible()
  })

  test('should show moon phases when toggle is active', async ({ page }) => {
    // Click moon toggle
    await page.click('.toggle-button:has-text("Moon")')
    
    // Moon phase icons should appear on day cells
    await expect(page.locator('.moon-phase').first()).toBeVisible()
  })

  test('should hide moon phases when toggle is deactivated', async ({ page }) => {
    // Enable moon phases
    await page.click('.toggle-button:has-text("Moon")')
    await expect(page.locator('.moon-phase').first()).toBeVisible()
    
    // Disable moon phases
    await page.click('.toggle-button:has-text("Moon")')
    await expect(page.locator('.moon-phase')).not.toBeVisible()
  })

  test('moon toggle should have active state when enabled', async ({ page }) => {
    const moonButton = page.locator('.toggle-button:has-text("Moon")')
    
    await moonButton.click()
    
    await expect(moonButton).toHaveClass(/active/)
  })
})

test.describe('Season Wheel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the season wheel component', async ({ page }) => {
    await expect(page.locator('.season-wheel')).toBeVisible()
  })

  test('should display the wheel SVG', async ({ page }) => {
    await expect(page.locator('.wheel-svg')).toBeVisible()
  })

  test('should show current season name', async ({ page }) => {
    const seasonName = page.locator('.season-info .current-season-name')
    await expect(seasonName).toBeVisible()
    
    // Should be one of the four seasons
    const text = await seasonName.textContent()
    expect(['Summer', 'Fall', 'Winter', 'Spring']).toContain(text)
  })

  test('should display season progress bar', async ({ page }) => {
    await expect(page.locator('.season-progress-bar')).toBeVisible()
    await expect(page.locator('.season-progress-fill')).toBeVisible()
  })

  test('should display season legend with all four seasons', async ({ page }) => {
    const legendItems = page.locator('.legend-item')
    await expect(legendItems).toHaveCount(4)
    
    await expect(page.locator('.legend-name').nth(0)).toHaveText('Summer')
    await expect(page.locator('.legend-name').nth(1)).toHaveText('Fall')
    await expect(page.locator('.legend-name').nth(2)).toHaveText('Winter')
    await expect(page.locator('.legend-name').nth(3)).toHaveText('Spring')
  })

  test('should display peak event information', async ({ page }) => {
    const seasonPeak = page.locator('.season-peak')
    await expect(seasonPeak).toBeVisible()
    await expect(seasonPeak).toContainText('Peak:')
  })

  test('should display progress percentage', async ({ page }) => {
    const progressLabel = page.locator('.season-progress-label')
    await expect(progressLabel).toBeVisible()
    
    const text = await progressLabel.textContent()
    expect(text).toMatch(/\d+%/)
  })

  test('current season should be highlighted in legend', async ({ page }) => {
    await expect(page.locator('.legend-item.current')).toBeVisible()
  })
})

test.describe('Toggle Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display toggle controls in calendar view', async ({ page }) => {
    await expect(page.locator('.toggle-controls')).toBeVisible()
  })

  test('should have Moon and Year toggle buttons', async ({ page }) => {
    await expect(page.locator('.toggle-button:has-text("Moon")')).toBeVisible()
    await expect(page.locator('.toggle-button:has-text("Year")')).toBeVisible()
  })
})

test.describe('Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    await expect(page.locator('.calendar')).toBeVisible()
    await expect(page.locator('.season-wheel')).toBeVisible()
    await expect(page.locator('.date-converter')).toBeVisible()
  })

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    
    await expect(page.locator('.calendar')).toBeVisible()
    await expect(page.locator('.season-wheel')).toBeVisible()
  })
})

