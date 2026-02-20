/**
 * Print a PDF blob using a hidden iframe to trigger the browser's native print dialog.
 * Falls back to opening in a new tab if the iframe print fails (e.g. on some mobile browsers).
 */
export function printPdfBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');

  // Use visibility:hidden instead of display:none — Safari won't print display:none iframes
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.visibility = 'hidden';
  iframe.src = url;

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Fallback: open in new tab for the user to print manually
      window.open(url, '_blank');
    }
  };

  document.body.appendChild(iframe);

  // Clean up after 60s to keep the blob alive during the print dialog
  setTimeout(() => {
    document.body.removeChild(iframe);
    URL.revokeObjectURL(url);
  }, 60_000);
}
