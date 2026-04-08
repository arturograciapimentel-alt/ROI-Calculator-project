const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, 'ROI-Calculator-Metrics-Reference.md'), 'utf8');

// Minimal Markdown → HTML converter for the subset used in this doc
function mdToHtml(text) {
  const lines = text.split('\n');
  const out = [];
  let inCode = false;
  let inTable = false;
  let inUl = false;
  let inBlockquote = false;

  const flush = (tag) => {
    if (tag === 'code'   && inCode)       { out.push('</code></pre>');  inCode = false; }
    if (tag === 'table'  && inTable)      { out.push('</tbody></table>'); inTable = false; }
    if (tag === 'ul'     && inUl)         { out.push('</ul>');           inUl = false; }
    if (tag === 'bq'     && inBlockquote) { out.push('</blockquote>');   inBlockquote = false; }
  };

  const escape = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const inline = s => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw;

    // Fenced code block
    if (line.startsWith('```')) {
      if (!inCode) {
        flush('table'); flush('ul'); flush('bq');
        out.push('<pre><code>');
        inCode = true;
      } else {
        flush('code');
      }
      continue;
    }
    if (inCode) { out.push(escape(line)); continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flush('table'); flush('ul'); flush('bq');
      out.push('<hr>');
      continue;
    }

    // Table row
    if (line.trim().startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (cells.every(c => /^[-: ]+$/.test(c))) continue; // separator row
      const tag = !inTable ? 'th' : 'td';
      if (!inTable) {
        flush('ul'); flush('bq');
        out.push('<table><thead><tr>');
        cells.forEach(c => out.push(`<th>${inline(c)}</th>`));
        out.push('</tr></thead><tbody>');
        inTable = true;
        continue;
      }
      out.push('<tr>');
      cells.forEach(c => out.push(`<td>${inline(c)}</td>`));
      out.push('</tr>');
      continue;
    }
    if (inTable) { flush('table'); }

    // Blockquote
    if (line.startsWith('> ')) {
      if (!inBlockquote) { flush('ul'); out.push('<blockquote>'); inBlockquote = true; }
      out.push(`<p>${inline(line.slice(2))}</p>`);
      continue;
    }
    if (inBlockquote) flush('bq');

    // Headings
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h1) { flush('ul'); out.push(`<h1>${inline(h1[1])}</h1>`); continue; }
    if (h2) { flush('ul'); out.push(`<h2>${inline(h2[1])}</h2>`); continue; }
    if (h3) { flush('ul'); out.push(`<h3>${inline(h3[1])}</h3>`); continue; }

    // List item
    if (line.match(/^[-*] /)) {
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    if (inUl && line.trim() === '') { flush('ul'); }

    // Empty line
    if (line.trim() === '') { out.push(''); continue; }

    // Paragraph
    out.push(`<p>${inline(line)}</p>`);
  }

  flush('code'); flush('table'); flush('ul'); flush('bq');
  return out.join('\n');
}

const body = mdToHtml(md);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px;
    line-height: 1.65;
    color: #1a1a2e;
    background: #fff;
    padding: 40px 48px;
    max-width: 820px;
    margin: 0 auto;
  }

  h1 {
    font-size: 22px;
    font-weight: 700;
    color: #0d1b2a;
    border-bottom: 3px solid #2e7d32;
    padding-bottom: 10px;
    margin-bottom: 8px;
    margin-top: 0;
  }

  h2 {
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    background: #1b3a4b;
    padding: 6px 12px;
    border-radius: 4px;
    margin-top: 28px;
    margin-bottom: 12px;
    page-break-after: avoid;
  }

  h3 {
    font-size: 11.5px;
    font-weight: 600;
    color: #1b3a4b;
    border-left: 3px solid #4CAF50;
    padding-left: 8px;
    margin-top: 18px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }

  p {
    margin-bottom: 7px;
    color: #2d2d2d;
  }

  pre {
    background: #f4f6f8;
    border: 1px solid #dde3ea;
    border-left: 4px solid #4CAF50;
    border-radius: 4px;
    padding: 10px 14px;
    margin: 10px 0;
    overflow-x: auto;
    page-break-inside: avoid;
  }

  code {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 9.5px;
    color: #1a1a2e;
    line-height: 1.7;
    white-space: pre;
  }

  p code, li code {
    background: #eef2f7;
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 9.5px;
    color: #1b3a4b;
    white-space: nowrap;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    font-size: 10.5px;
    page-break-inside: avoid;
  }

  th {
    background: #1b3a4b;
    color: #fff;
    font-weight: 600;
    text-align: left;
    padding: 6px 10px;
    border: 1px solid #1b3a4b;
  }

  td {
    padding: 5px 10px;
    border: 1px solid #dde3ea;
    vertical-align: top;
  }

  tr:nth-child(even) td { background: #f8fafc; }

  ul {
    margin: 6px 0 10px 20px;
  }

  li {
    margin-bottom: 4px;
    color: #2d2d2d;
  }

  blockquote {
    background: #fff8e1;
    border-left: 4px solid #f9a825;
    border-radius: 0 4px 4px 0;
    padding: 8px 14px;
    margin: 10px 0;
    page-break-inside: avoid;
  }

  blockquote p {
    color: #4a3800;
    margin: 0;
  }

  hr {
    border: none;
    border-top: 1px solid #dde3ea;
    margin: 20px 0;
  }

  strong { color: #1a1a2e; }

  /* Cover-style subtitle under H1 */
  h1 + p {
    color: #555;
    font-size: 11px;
    margin-bottom: 20px;
  }

  @page {
    margin: 18mm 14mm;
    @bottom-center {
      content: counter(page) " / " counter(pages);
      font-size: 9px;
      color: #999;
    }
  }

  @media print {
    h2 { page-break-before: auto; }
  }
</style>
</head>
<body>
${body}
<div style="margin-top:40px; padding-top:14px; border-top:1px solid #dde3ea; font-size:9px; color:#aaa; text-align:center;">
  Duetto ROI Calculator — Internal Reference &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}
</div>
</body>
</html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });

  const outPath = path.join(__dirname, 'ROI-Calculator-Metrics-Reference.pdf');
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '18mm', left: '14mm', right: '14mm' },
  });

  await browser.close();
  console.log('PDF saved to:', outPath);
})();
