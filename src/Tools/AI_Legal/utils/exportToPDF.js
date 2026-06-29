/**
 * exportToPDF.js
 *
 * Pixel-perfect PDF export for AI Legal output.
 *
 * Strategy:
 *   1. Parse the markdown text into HTML using a lightweight inline parser.
 *   2. Inject the HTML into a hidden off-screen container styled to match the
 *      on-screen output (correct fonts, colours, spacing, bidirectional text).
 *   3. Capture the container via html2canvas-pro (handles mixed Hindi + English
 *      perfectly because the browser's own layout engine does the rendering).
 *   4. Slice the canvas into A4-sized pages and embed each slice into jsPDF.
 *
 * Why html2canvas instead of jsPDF text mode:
 *   - jsPDF's splitTextToSize() silently drops characters that don't have
 *     metrics in the current font; this breaks mixed Hindi + English content.
 *   - html2canvas renders whatever the browser renders, so every Unicode
 *     character, digit, legal citation, case name and mixed-language sentence
 *     appears exactly as it does on screen.
 */

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

// ---------------------------------------------------------------------------
// Lightweight Markdown → HTML parser
// Handles: headings, bold, italic, bullet lists, numbered lists, inline code,
//          horizontal rules, blank lines and plain paragraphs.
// All characters pass through verbatim — no stripping of English/digits/etc.
// ---------------------------------------------------------------------------
function markdownToHTML(md) {
  if (!md) return '';

  const lines = md.split('\n');
  const htmlLines = [];
  let inUL = false;
  let inOL = false;

  const closeList = () => {
    if (inUL) { htmlLines.push('</ul>'); inUL = false; }
    if (inOL) { htmlLines.push('</ol>'); inOL = false; }
  };

  const inlineFormat = (text) =>
    text
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw;

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      closeList();
      htmlLines.push('<hr/>');
      continue;
    }

    // ATX Headings
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h1) { closeList(); htmlLines.push(`<h1>${inlineFormat(h1[1])}</h1>`); continue; }
    if (h2) { closeList(); htmlLines.push(`<h2>${inlineFormat(h2[1])}</h2>`); continue; }
    if (h3) { closeList(); htmlLines.push(`<h3>${inlineFormat(h3[1])}</h3>`); continue; }

    // Unordered list item  (- / * / •)
    const ulMatch = line.match(/^(\s*)[-*•]\s+(.*)/);
    if (ulMatch) {
      if (!inUL) { if (inOL) { htmlLines.push('</ol>'); inOL = false; } htmlLines.push('<ul>'); inUL = true; }
      htmlLines.push(`<li>${inlineFormat(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^(\s*)\d+[.)]\s+(.*)/);
    if (olMatch) {
      if (!inOL) { if (inUL) { htmlLines.push('</ul>'); inUL = false; } htmlLines.push('<ol>'); inOL = true; }
      htmlLines.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      closeList();
      htmlLines.push('<br/>');
      continue;
    }

    // Plain paragraph
    closeList();
    htmlLines.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeList();
  return htmlLines.join('\n');
}

// ---------------------------------------------------------------------------
// CSS injected into the off-screen render container.
// Uses Noto Sans so both Devanagari and Latin render from a single face.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// CSS injected into the off-screen render container.
// Uses local Noto Sans Devanagari font face and standard sans-serif fallback.
// Includes professional formatting for paragraphs, headings, lists, tables,
// code, blockquotes, and dividers.
// ---------------------------------------------------------------------------
const RENDER_CSS = `
  @font-face {
    font-family: 'Noto Sans Devanagari';
    font-style: normal;
    font-weight: 400;
    src: url('/fonts/NotoSansDevanagari-Regular.ttf') format('truetype');
  }
  @font-face {
    font-family: 'Noto Sans Devanagari';
    font-style: normal;
    font-weight: 700;
    src: url('/fonts/NotoSansDevanagari-Bold.ttf') format('truetype');
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body, .pdf-root {
    font-family: 'Times New Roman', Times, 'Noto Sans Devanagari', 'Noto Sans', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.15;
    color: #000;
    background: #fff;
    padding: 1in;
    width: 794px;          /* A4 at 96 dpi */
    word-break: break-word;
  }

  h1 { font-size: 13pt; font-weight: bold; margin: 14pt 0 6pt; border: none; padding: 0; text-transform: uppercase; text-align: left; }
  h2 { font-size: 13pt; font-weight: bold; margin: 14pt 0 6pt; text-transform: uppercase; }
  h3 { font-size: 11pt; font-weight: bold; margin: 12pt 0 6pt; }
  h4 { font-size: 11pt; font-weight: bold; margin: 10pt 0 4pt; }

  p  { margin: 0 0 6pt 0; text-align: justify; }
  br { display: block; content: ""; margin: 6pt 0; }

  ul { margin: 6px 0 6px 20px; list-style: disc; }
  ol { margin: 6px 0 6px 20px; list-style: decimal; }
  li { margin: 3px 0; }

  blockquote {
    border-left: 3px solid #ccc;
    padding-left: 12px;
    color: #555;
    font-style: italic;
    margin: 8px 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 12px;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
    line-height: 1.5;
  }
  th {
    background-color: #f7f9fa;
    font-weight: 700;
  }

  hr { border: none; border-top: 1px solid #bbb; margin: 12px 0; }

  code {
    font-family: 'Courier New', Courier, monospace;
    background: #f3f3f3;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
  }

  pre {
    background: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 10px 0;
  }
  pre code {
    background: none;
    padding: 0;
    border-radius: 0;
  }

  strong { font-weight: 700; }
  em     { font-style: italic; }
  a      { color: #1a237e; text-decoration: underline; }

  /* PDF header area */
  .pdf-header {
    border-bottom: 2px solid #1a237e;
    padding-bottom: 10px;
    margin-bottom: 18px;
  }
  .pdf-header h1 {
    border: none;
    padding: 0;
    margin: 0 0 4px;
    color: #1a237e;
    font-size: 16px;
  }
  .pdf-meta {
    font-size: 11px;
    color: #444;
    line-height: 1.6;
  }
`;

// ---------------------------------------------------------------------------
// Build the off-screen iframe + container
// ---------------------------------------------------------------------------
function buildRenderFrame(headerHTML, contentHTML) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;height:auto;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>${RENDER_CSS}</style>
</head>
<body>
<div class="pdf-root">
  <div class="pdf-header">${headerHTML}</div>
  <div class="pdf-content">${contentHTML}</div>
</div>
</body>
</html>`);
  doc.close();

  return iframe;
}

// ---------------------------------------------------------------------------
// Wait for iframe fonts to load
// ---------------------------------------------------------------------------
function waitForFonts(iframe) {
  return new Promise((resolve) => {
    const win = iframe.contentWindow;
    if (win.document.fonts && win.document.fonts.ready) {
      win.document.fonts.ready.then(resolve);
    } else {
      setTimeout(resolve, 600);
    }
  });
}

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------
/**
 * exportToPDF
 *
 * @param {object} options
 * @param {HTMLElement} [options.element] - Already rendered DOM element on screen
 * @param {string}  [options.htmlContent]  - Raw HTML content to render
 * @param {string}  [options.text]         - The fallback markdown text to export
 * @param {string}  options.title          - PDF document title line
 * @param {string}  options.filename       - Output filename (without .pdf)
 * @param {object}  [options.meta]         - Key-value pairs shown below the title
 * @param {string}  [options.lang]         - 'en' | 'hi'
 */
export async function exportToPDF({ element, htmlContent, text, title, filename, meta = {}, lang = 'en', returnBlob = false }) {
  // 1. Build header HTML
  const metaRows = Object.entries(meta)
    .map(([k, v]) => `<span><strong>${k}:</strong> ${v}</span>`)
    .join('&nbsp;&nbsp;|&nbsp;&nbsp;');

  const headerHTML = `
    <h1>${title}</h1>
    <div class="pdf-meta">${metaRows}</div>
  `;

  // 2. Extract content HTML: prioritize DOM element, then raw htmlContent, then fallback to markdownToHTML
  let contentHTML = '';
  if (element) {
    contentHTML = element.innerHTML;
  } else if (htmlContent) {
    contentHTML = htmlContent;
  } else {
    contentHTML = markdownToHTML(text || '');
  }

  // 3. Build off-screen iframe
  const iframe = buildRenderFrame(headerHTML, contentHTML);

  // 4. Wait for layout + fonts
  await waitForFonts(iframe);
  // Extra settle time for local fonts rendering in iframe
  await new Promise(r => setTimeout(r, 800));

  const root = iframe.contentDocument.querySelector('.pdf-root');

  // 5. Capture with html2canvas-pro
  let canvas;
  try {
    canvas = await html2canvas(root, {
      scale: 2,                  // 2× for crisp text on retina and print
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    });
  } finally {
    document.body.removeChild(iframe);
  }

  // 6. Slice canvas into A4 pages and embed in jsPDF
  const A4_W_MM  = 210;
  const A4_H_MM  = 297;
  const DPI      = 96;
  const MM_PER_PX = 25.4 / DPI;

  // canvas is at scale=2, so 1 canvas px = 0.5 logical px
  const canvasW  = canvas.width;           // px at scale 2
  const canvasH  = canvas.height;          // px at scale 2

  // A4 page height in canvas pixels (at scale 2)
  const pageH_px = Math.round((A4_H_MM / MM_PER_PX) * 2);
  const pageW_px = canvasW;               // full width fills page

  const imgW_mm  = A4_W_MM;
  const imgH_mm  = (pageW_px / canvasW) * A4_W_MM;  // = A4_W_MM (full width)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let yOffset = 0;
  let pageIndex = 0;
  const totalPages = Math.ceil(canvasH / pageH_px) || 1;

  while (yOffset < canvasH) {
    const sliceH = Math.min(pageH_px, canvasH - yOffset);

    // Draw the slice onto a temporary canvas of full A4 height to ensure alignment
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width  = pageW_px;
    sliceCanvas.height = pageH_px;
    const ctx = sliceCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageW_px, pageH_px);
    ctx.drawImage(canvas, 0, yOffset, pageW_px, sliceH, 0, 0, pageW_px, sliceH);

    // Draw page footer metadata
    const footerH = 80;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, pageH_px - footerH, pageW_px, footerH);

    // Gray separator rule above footer
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96, pageH_px - footerH);
    ctx.lineTo(pageW_px - 96, pageH_px - footerH);
    ctx.stroke();

    // Centered footer details
    ctx.font = "20px 'Times New Roman', Times, serif";
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.fillText(`AI LEGAL™   |   Confidential Legal Document   |   Page ${pageIndex + 1} of ${totalPages}`, pageW_px / 2, pageH_px - 30);

    const sliceImgData = sliceCanvas.toDataURL('image/png');

    if (pageIndex > 0) doc.addPage();
    doc.addImage(sliceImgData, 'PNG', 0, 0, imgW_mm, A4_H_MM);

    yOffset += sliceH;
    pageIndex++;
  }

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(`${filename}_${Date.now()}.pdf`);
}
