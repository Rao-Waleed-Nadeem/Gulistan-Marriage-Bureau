import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBilingualPhone,
  formatBilingualReferenceCode,
  formatBilingualCurrency,
  formatBilingualDate,
  validateTouchTarget,
  validateAriaLabel,
  calculateContrastRatio,
  validateWcagContrast,
  LRI,
  PDI,
} from './accessibility';

test('Accessibility & Localization: formatBilingualPhone wraps phone numbers in LTR isolate', () => {
  const phone = '+92 300 1234567';
  const formatted = formatBilingualPhone(phone);

  assert.equal(formatted, `${LRI}+92 300 1234567${PDI}`);
  assert.equal(formatBilingualPhone(''), '');
  assert.equal(formatBilingualPhone(null), '');
});

test('Accessibility & Localization: formatBilingualReferenceCode protects candidate IDs from RTL inversion', () => {
  const refCode = 'GLS-101';
  const formatted = formatBilingualReferenceCode(refCode);

  assert.equal(formatted, `${LRI}GLS-101${PDI}`);
  assert.equal(formatBilingualReferenceCode(''), '');
});

test('Accessibility & Localization: formatBilingualCurrency produces cultural currency formats', () => {
  const enCurrency = formatBilingualCurrency(25000, 'en');
  assert.ok(enCurrency.includes('PKR'));
  assert.ok(enCurrency.includes('25,000'));

  const urCurrency = formatBilingualCurrency(25000, 'ur');
  assert.ok(urCurrency.includes('روپے'));

  const negCurrency = formatBilingualCurrency(-5000, 'en');
  assert.ok(negCurrency.startsWith('-PKR'));
});

test('Accessibility & Localization: formatBilingualDate formats English and Urdu dates correctly', () => {
  const iso = '2026-11-14T10:00:00Z';
  const enDate = formatBilingualDate(iso, 'en');
  assert.ok(enDate.includes('November') && enDate.includes('2026'));

  const urDate = formatBilingualDate(iso, 'ur');
  assert.ok(urDate.includes('نومبر') && urDate.includes('2026'));

  assert.equal(formatBilingualDate(null), '');
  assert.equal(formatBilingualDate('invalid-date'), '');
});

test('Accessibility & Localization: validateTouchTarget enforces Android 44px minimum touch targets', () => {
  // Mobile touch target pass: 48 x 48 px
  const validButton = validateTouchTarget(48, 48);
  assert.equal(validButton.valid, true);

  // Minimum boundary: 44 x 44 px
  const minButton = validateTouchTarget(44, 44);
  assert.equal(minButton.valid, true);

  // Sub-standard button: 32 x 32 px
  const smallButton = validateTouchTarget(32, 44);
  assert.equal(smallButton.valid, false);
  assert.equal(smallButton.minRequiredPx, 44);
});

test('Accessibility & Localization: validateAriaLabel requires non-empty accessible labels', () => {
  assert.equal(validateAriaLabel('Close dialog'), true);
  assert.equal(validateAriaLabel('Language switch to Urdu'), true);
  assert.equal(validateAriaLabel(''), false);
  assert.equal(validateAriaLabel('   '), false);
  assert.equal(validateAriaLabel(null), false);
  assert.equal(validateAriaLabel(undefined), false);
});

test('Accessibility & Localization: WCAG color contrast validator enforces 4.5:1 ratio for Gulistan palette', () => {
  // Gulistan Emerald 900 on White
  // Emerald 900: #064e3b, White: #ffffff
  const emeraldContrast = validateWcagContrast('#064e3b', '#ffffff');
  assert.equal(emeraldContrast.pass, true);
  assert.ok(emeraldContrast.ratio >= 8.0, `Contrast ratio (${emeraldContrast.ratio}) must be >= 8.0`);

  // Slate 900 on White (#0f172a on #ffffff)
  const slateContrast = validateWcagContrast('#0f172a', '#ffffff');
  assert.equal(slateContrast.pass, true);
  assert.ok(slateContrast.ratio >= 10.0);

  // Low contrast pair (#94a3b8 light slate on #ffffff) fails for normal text (requires 4.5:1)
  const lowContrast = validateWcagContrast('#94a3b8', '#ffffff', false);
  assert.equal(lowContrast.pass, false);
});
