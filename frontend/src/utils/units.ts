/**
 * Land area conversion utilities for Pakistani land metrics (Marla, Kanal, Sq Ft).
 */

export interface LandConversionResult {
  kanal: number;
  remainingMarla: number;
  originalMarla: number;
  formattedEn: string;
  formattedUrdu: string;
  sqFtEquivalent: number;
}

/**
 * Converts total marlas into Kanals and Marlas.
 * @param marlas Total marlas entered by user
 * @param marlaPerKanal Conventional ratio (default 20 marla = 1 kanal in Punjab/Islamabad; 18 in parts of KP)
 * @param sqFtPerMarla Default 225 sq ft in modern standards (or 272 sq ft traditional)
 */
export function convertMarlaToKanal(
  marlas: number,
  marlaPerKanal: number = 20,
  sqFtPerMarla: number = 225
): LandConversionResult {
  if (isNaN(marlas) || marlas < 0) {
    return {
      kanal: 0,
      remainingMarla: 0,
      originalMarla: 0,
      formattedEn: '0 Marla',
      formattedUrdu: '۰ مرلہ',
      sqFtEquivalent: 0,
    };
  }

  const kanal = Math.floor(marlas / marlaPerKanal);
  const remainingMarla = Number((marlas % marlaPerKanal).toFixed(2));
  const sqFtEquivalent = Math.round(marlas * sqFtPerMarla);

  let formattedEn = '';
  let formattedUrdu = '';

  if (kanal > 0 && remainingMarla > 0) {
    formattedEn = `${kanal} Kanal, ${remainingMarla} Marla`;
    formattedUrdu = `${kanal} کنال، ${remainingMarla} مرلہ`;
  } else if (kanal > 0) {
    formattedEn = `${kanal} Kanal`;
    formattedUrdu = `${kanal} کنال`;
  } else {
    formattedEn = `${remainingMarla} Marla`;
    formattedUrdu = `${remainingMarla} مرلہ`;
  }

  return {
    kanal,
    remainingMarla,
    originalMarla: marlas,
    formattedEn,
    formattedUrdu,
    sqFtEquivalent,
  };
}
