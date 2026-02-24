import { Font } from '@react-pdf/renderer';

export const PDF_FONT_FAMILY = 'Noto Sans SC';
export const PDF_FONT_FAMILY_TC = 'Noto Sans TC';

export function getPdfFontFamily(locale: string): string {
  if (locale === 'zh-TW') return PDF_FONT_FAMILY_TC;
  return PDF_FONT_FAMILY;
}

let registered = false;

/**
 * Register Noto Sans SC for CJK-compatible PDF rendering.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function registerPdfFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/notosanssc/v37/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_EnYxNbPzS5HE.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/notosanssc/v37/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnIxNbPzS5HE.ttf',
        fontWeight: 700,
      },
    ],
  });

  Font.register({
    family: PDF_FONT_FAMILY_TC,
    fonts: [
      {
        src: 'https://fonts.gstatic.com/s/notosanstc/v39/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz76Cy_Co.ttf',
        fontWeight: 400,
      },
      {
        src: 'https://fonts.gstatic.com/s/notosanstc/v39/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz70e1_Co.ttf',
        fontWeight: 700,
      },
    ],
  });

  // CJK text doesn't use spaces between words — allow wrapping at every character
  Font.registerHyphenationCallback((word) => {
    // Check if word contains CJK characters
    if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(word)) {
      return Array.from(word);
    }
    return [word];
  });
}
