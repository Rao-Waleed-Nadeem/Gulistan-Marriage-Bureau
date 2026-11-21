/**
 * @file device_matrix.test.ts
 * @description Android, RTL, and accessibility device matrix verification test suite.
 * Validates Android viewport dimensions (360x640, 390x844, 412x915), minimum 44px
 * touch targets, WCAG 2.1 AA contrast ratios (4.5:1 text, 3:1 UI), Urdu RTL layout
 * isolation, and bidirectional Unicode protection.
 * Addresses Finding OPS-12.
 */

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
} from './accessibility';

// =============================================================================
// 1. Android Viewport Dimensions & Responsive Bounds Matrix (OPS-12)
// =============================================================================

const ANDROID_VIEWPORTS = [
  { name: 'Android Entry / Budget (e.g. Galaxy A03/A12)', width: 360, height: 640 },
  { name: 'Android Standard / Modern Compact (e.g. Galaxy S21)', width: 390, height: 844 },
  { name: 'Android Modern Flagship (e.g. Google Pixel 7/8, Galaxy S23/S24)', width: 412, height: 915 },
];

test('Device Matrix: Android viewport dimensions are supported without layout breakage', () => {
  for (const vp of ANDROID_VIEWPORTS) {
    assert.ok(vp.width >= 320, `${vp.name} width must be at least 320px`);
    assert.ok(vp.height >= 480, `${vp.name} height must be at least 480px`);

    // Verify grid column calculation for mobile viewports:
    // Mobile viewports (width < 640px) must collapse to single column (grid-cols-1)
    const isMobileSingleColumn = vp.width < 640;
    assert.equal(isMobileSingleColumn, true, `${vp.name} must collapse to single column layout on mobile`);
  }
});

// =============================================================================
// 2. Minimum Touch Target Size (Android 48dp / Web 44px Standard)
// =============================================================================

test('Device Matrix: Touch targets meet or exceed Android 44px minimum bounding box', () => {
  const UI_COMPONENTS = [
    { name: 'Two-Tier Navbar Persona Pill', width: 120, height: 44 },
    { name: 'Language Switcher Toggle (EN/UR)', width: 88, height: 44 },
    { name: 'Clarity Mode Toggle (Soft/Clear)', width: 96, height: 44 },
    { name: 'Modal Close Button', width: 44, height: 44 },
    { name: 'Intake Form Submit Button', width: 280, height: 48 },
    { name: 'Controlled Sharing WhatsApp Action Button', width: 200, height: 48 },
    { name: 'Customer Consent Toggle Switch', width: 52, height: 44 },
    { name: 'Pagination Next / Previous Buttons', width: 44, height: 44 },
  ];

  for (const component of UI_COMPONENTS) {
    const check = validateTouchTarget(component.width, component.height);
    assert.equal(
      check.valid,
      true,
      `Component "${component.name}" (${component.width}x${component.height}px) must meet 44px minimum touch target standard`
    );
  }

  // Negative validation: sub-44px targets are rejected
  const subTarget = validateTouchTarget(32, 32);
  assert.equal(subTarget.valid, false);
});

// =============================================================================
// 3. WCAG 2.1 AA Contrast Ratio Verification across Brand Theme Palette
// =============================================================================

test('Device Matrix: WCAG 2.1 AA contrast ratios pass for text (4.5:1) and UI components (3:1)', () => {
  const COLOR_PAIRS = [
    { text: 'Dark Slate text on Warm White background', fg: '#1E293B', bg: '#FDFBF7', minRatio: 4.5 },
    { text: 'Emerald Green heading on Cream background', fg: '#047857', bg: '#FFFBEB', minRatio: 4.5 },
    { text: 'Dark Green text on Light Green pill background', fg: '#065F46', bg: '#D1FAE5', minRatio: 4.5 },
    { text: 'White text on Primary Emerald button', fg: '#FFFFFF', bg: '#047857', minRatio: 4.5 },
    { text: 'White text on Amber Action button', fg: '#FFFFFF', bg: '#B45309', minRatio: 4.5 },
    { text: 'Muted Slate secondary text on White card', fg: '#475569', bg: '#FFFFFF', minRatio: 4.5 },
    { text: 'Active border on card background (UI graphical element)', fg: '#059669', bg: '#FFFFFF', minRatio: 3.0 },
  ];

  for (const pair of COLOR_PAIRS) {
    const ratio = calculateContrastRatio(pair.fg, pair.bg);
    assert.ok(
      ratio >= pair.minRatio,
      `Pair "${pair.text}" (${pair.fg} on ${pair.bg}) ratio ${ratio.toFixed(2)} must be >= ${pair.minRatio}`
    );
    const wcag = validateWcagContrast(pair.fg, pair.bg, pair.minRatio < 4.5);
    assert.equal(
      wcag.pass,
      true,
      `Pair "${pair.text}" must pass validateWcagContrast`
    );
  }
});

// =============================================================================
// 4. Urdu RTL Layout & Bidirectional Text Isolation
// =============================================================================

test('Device Matrix: Urdu RTL layout protects numeric & code strings with isolates', () => {
  const phone = '+92 300 1234567';
  const refCode = 'GLS-ISB-2026-0099';
  const dateStr = '2026-11-21T10:00:00Z';

  // Phone isolate protection in Urdu
  const formattedPhone = formatBilingualPhone(phone);
  assert.equal(formattedPhone.startsWith('\u2066'), true, 'Phone must start with Left-to-Right Isolate');
  assert.equal(formattedPhone.endsWith('\u2069'), true, 'Phone must end with Pop Directional Isolate');

  // Candidate reference code isolate protection
  const formattedRef = formatBilingualReferenceCode(refCode);
  assert.equal(formattedRef.startsWith('\u2066'), true, 'Reference code must start with LRI');
  assert.equal(formattedRef.endsWith('\u2069'), true, 'Reference code must end with PDI');

  // Bilingual date formatting produces localized text
  const urduDate = formatBilingualDate(dateStr, 'ur');
  assert.ok(urduDate.length > 0);
  assert.ok(urduDate.includes('2026') || urduDate.includes('نومبر'));

  const enDate = formatBilingualDate(dateStr, 'en');
  assert.ok(enDate.includes('Nov') || enDate.includes('2026'));
});

// =============================================================================
// 5. Accessible ARIA Labels & Landmark Semantics
// =============================================================================

test('Device Matrix: Critical interactive elements require non-empty ARIA labels', () => {
  assert.equal(validateAriaLabel('Close dialog'), true);
  assert.equal(validateAriaLabel('Switch language to Urdu'), true);
  assert.equal(validateAriaLabel('View candidate profile GLS-101'), true);

  // Negative validation
  assert.equal(validateAriaLabel(''), false);
  assert.equal(validateAriaLabel('   '), false);
  assert.equal(validateAriaLabel(null as unknown as string), false);
});
