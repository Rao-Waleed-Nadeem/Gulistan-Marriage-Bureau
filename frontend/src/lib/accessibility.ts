/**
 * @file accessibility.ts
 * @description Localization, bi-directional text isolation (Urdu RTL / English LTR),
 * touch target validation, and WCAG accessibility helpers for Gulistan Marriage Bureau.
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. Numbers, phone formats (+92 300 1234567), and reference codes (GLS-101) must use
 *    directional isolation (\u2066...\u2069) to prevent character scrambling in RTL text.
 * 2. Mobile touch targets on Android must be at least 44x44px per WCAG / Material guidelines.
 * 3. Color contrast must satisfy WCAG AA (>= 4.5:1 for normal text, >= 3.0:1 for large text/icons).
 */

import { Language } from '../types';

/**
 * Unicode Bi-directional Isolates
 * U+2066: LEFT-TO-RIGHT ISOLATE (LRI)
 * U+2069: POP DIRECTIONAL ISOLATE (PDI)
 */
export const LRI = '\u2066';
export const PDI = '\u2069';

/**
 * Wraps a Pakistani phone number in an LTR isolate to prevent dash and digit inversion in Urdu RTL.
 * @param phone
 */
export function formatBilingualPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  return `${LRI}${trimmed}${PDI}`;
}

/**
 * Wraps a candidate or batch reference code (e.g. GLS-101, MIG-WH-20261114) in an LTR isolate.
 * @param code
 */
export function formatBilingualReferenceCode(code: string | null | undefined): string {
  if (!code) return '';
  const trimmed = code.trim();
  return `${LRI}${trimmed}${PDI}`;
}

/**
 * Formats a monetary amount with currency symbol and culturally appropriate placement.
 * @param amountPKR
 * @param lang
 */
export function formatBilingualCurrency(amountPKR: number, lang: Language = 'en'): string {
  const formattedNumber = Math.abs(amountPKR).toLocaleString(lang === 'ur' ? 'ur-PK' : 'en-PK');
  const sign = amountPKR < 0 ? '-' : '';

  if (lang === 'ur') {
    return `${sign}${formattedNumber} روپے`;
  }
  return `${sign}PKR ${formattedNumber}`;
}

/**
 * Formats an ISO date into culturally localized bilingual text.
 * @param isoDate
 * @param lang
 */
export function formatBilingualDate(isoDate: string | null | undefined, lang: Language = 'en'): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';

  const URDU_MONTHS = [
    'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
    'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
  ];

  if (lang === 'ur') {
    const day = date.getDate();
    const month = URDU_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Validates interactive touch target dimensions for mobile / Android responsiveness.
 * WCAG 2.5.5 / Android standard: minimum 44 x 44 CSS pixels.
 * @param widthPx
 * @param heightPx
 * @param minDimensionPx
 */
export function validateTouchTarget(
  widthPx: number,
  heightPx: number,
  minDimensionPx: number = 44
): { valid: boolean; minRequiredPx: number; actualWidth: number; actualHeight: number } {
  const valid = widthPx >= minDimensionPx && heightPx >= minDimensionPx;
  return {
    valid,
    minRequiredPx: minDimensionPx,
    actualWidth: widthPx,
    actualHeight: heightPx,
  };
}

/**
 * Validates that an interactive control has an accessible name (aria-label, title, or text).
 * @param label
 */
export function validateAriaLabel(label: string | null | undefined): boolean {
  return typeof label === 'string' && label.trim().length > 0;
}

/**
 * Converts a hex color (#RRGGBB) to relative luminance according to WCAG 2.1 specs.
 * @param hex
 */
export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculates the WCAG contrast ratio between two hex colors.
 * Contrast Ratio = (L1 + 0.05) / (L2 + 0.05), where L1 is lighter.
 * @param hex1
 * @param hex2
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Number(ratio.toFixed(2));
}

/**
 * Validates whether a color pair satisfies WCAG AA contrast requirements.
 * Normal text: >= 4.5:1. Large text (>= 18pt or 14pt bold) / UI icons: >= 3.0:1.
 * @param foregroundHex
 * @param backgroundHex
 * @param isLargeText
 */
export function validateWcagContrast(
  foregroundHex: string,
  backgroundHex: string,
  isLargeText: boolean = false
): { pass: boolean; ratio: number; requiredRatio: number } {
  const ratio = calculateContrastRatio(foregroundHex, backgroundHex);
  const requiredRatio = isLargeText ? 3.0 : 4.5;
  return {
    pass: ratio >= requiredRatio,
    ratio,
    requiredRatio,
  };
}
