import * as Print from 'expo-print';
import { Platform } from 'react-native';

const escape = (text: string) => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** One printable page: the picture as large as the sheet allows, with its title. */
function pageHtml(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>
    @page { margin: 14mm; }
    html, body { background: #fff !important; }
    body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #16394D; text-align: center; }
    h1 { font-size: 22pt; margin: 0 0 10mm; }
    img { max-width: 100%; max-height: 220mm; height: auto; }
    .drawing { display: inline-block; text-align: left; }
    footer { margin-top: 8mm; font-size: 9pt; color: #6B7F90; }
  </style></head><body><h1>${escape(title)}</h1>${body}<footer>ONE KIDS · La pizarra de tu tutor</footer></body></html>`;
}

/** Prints only the picture (not the whole app): a hidden frame on the web, the system dialog on phones. */
/** A drawing is passed as the board's rendered markup (web only); its styles come along. */
export async function printPicture(title: string, picture: { imageUrl: string } | { markup: string }) {
  const body = 'imageUrl' in picture ? `<img src="${escape(picture.imageUrl)}" alt="${escape(title)}">` : `<div class="drawing">${picture.markup}</div>`;
  const html = pageHtml(title || 'Dibujo del tutor', body);
  if (Platform.OS !== 'web') { await Print.printAsync({ html }); return; }
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open(); doc.write(html); doc.close();
  // The app's styles (react-native-web classes and fonts) so a drawing looks like on the board.
  if ('markup' in picture) document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => doc.head.appendChild(doc.importNode(node, true)));
  const images = Array.from(doc.images);
  await Promise.all(images.map(img => img.complete ? null : new Promise(done => { img.onload = img.onerror = done; })));
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
  setTimeout(() => frame.remove(), 60_000);
}
