// Generates data/*.js modules for the mini program: faithful HTML for <rich-text>.
// Styles are read from the *rendered* site (computed), so nested font-size resets,
// bold runs, table shading/borders and list indents all match what the site shows.
// Usage: node gen-legal.mjs '[{"url":"/esgcodehk","sel":".esgContainer","out":"/tmp/x.js"}]'
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/');
const { chromium } = require('playwright');
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const targets = JSON.parse(process.argv[2]);

const builder = (sel) => {
  const root = document.querySelector(sel);
  if (!root) return '';
  const cs = (el) => getComputedStyle(el);
  const n = (v) => {
    const f = parseFloat(v);
    if (!isFinite(f)) return null;
    const r = Math.round(f * 10) / 10;
    return r === 0 ? 0 : r;
  };
  const KEEP = new Set(['p', 'b', 'strong', 'span', 'div', 'br', 'ol', 'ul', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'img', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'em', 'i', 'u', 'sub', 'sup', 'blockquote', 'hr']);
  const INLINE = new Set(['span', 'b', 'strong', 'a', 'i', 'em', 'u', 'sub', 'sup', 'code']);
  const defaultColor = 'rgb(45, 45, 45)';

  const borderSide = (s, side) => {
    const prop = 'border' + side;
    const w = n(s[prop + 'Width']);
    if (!w) return '';
    const st = s[prop + 'Style'];
    if (st === 'none' || st === 'hidden') return '';
    return `border-${side.toLowerCase()}:${w}px ${st} ${s[prop + 'Color']};`;
  };

  const contentLeft = (el) => {
    const s = cs(el);
    const r = el.getBoundingClientRect();
    return r.left + (parseFloat(s.borderLeftWidth) || 0) + (parseFloat(s.paddingLeft) || 0);
  };
  const x = (el) => {
    // Offset inside the nearest block container (a table cell for lists in tables),
    // never the page, so recreated list indent stays inside its parent.
    const ref = el.parentElement ? contentLeft(el.parentElement) : root.getBoundingClientRect().left;
    return Math.round(el.getBoundingClientRect().left - ref);
  };

  // rich-text renders a limited HTML subset: list markers are not reliably drawn,
  // so each <li> becomes a hanging-indent paragraph with a literal bullet/number.
  const renderList = (list, ordered) => {
    const listStyle = cs(list);
    const listMb = n(listStyle.marginBottom) || 0;
    const listMt = n(listStyle.marginTop) || 0;
    // Indent is measured from the container that will hold the recreated paragraphs
    // (the list is dissolved, so the list's own margin must be folded into the items).
    const refLeft = list.parentElement ? contentLeft(list.parentElement) : root.getBoundingClientRect().left;
    const items = [...list.children].filter((c) => c.tagName === 'LI');
    return items.map((li, idx) => {
      const ls = cs(li);
      const lx = Math.round(li.getBoundingClientRect().left - refLeft);
      const last = idx === items.length - 1;
      const mb = (n(ls.marginBottom) || 0) + (last ? listMb : 0);
      const mt = idx === 0 ? listMt : 0;
      const lfw = parseInt(ls.fontWeight, 10);
      const markerStyle = `font-size:${n(ls.fontSize)}px;` + (lfw >= 500 ? `font-weight:${lfw};` : '');
      const marker = ordered ? `${idx + 1}.` : '\u2022';
      const markerHtml = `<span style="${markerStyle}">${marker}</span> `;
      const hang = 'padding-left:12px;text-indent:-12px;';
      const bodyStyle = `font-size:${n(ls.fontSize)}px;` + (ls.lineHeight !== 'normal' ? `line-height:${n(ls.lineHeight)}px;` : '');
      const indent = Math.max(0, lx - 12);
      const kids = [...li.childNodes];
      const firstP = kids.findIndex((c) => c.nodeType === 1 && c.tagName === 'P');
      // The marker is injected into the first paragraph by render(); when the <li>
      // holds bare text it needs a wrapper paragraph of its own.
      const inner = kids.map((c, i) => {
        if (firstP === i) pendingList = { marker: markerHtml, extra: `${hang}margin-left:${indent}px;` };
        return render(c);
      }).join('').trim();
      pendingList = null;
      if (firstP >= 0) return inner;
      return `<p style="margin:${mt}px 0 ${mb}px ${indent}px;${hang}${bodyStyle}">${markerHtml}${inner}</p>`;
    }).join('');
  };

  let pendingList = null;

  const render = (node) => {
    if (node.nodeType === 3) return node.nodeValue.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    const kids = () => {
      const nodes = [...node.childNodes];
      const isInlineEl = (el) => el && el.nodeType === 1 && INLINE.has(el.tagName.toLowerCase());
      return nodes.map((c, i) => {
        if (c.nodeType === 3) {
          if (!c.nodeValue.trim()) return isInlineEl(nodes[i - 1]) && isInlineEl(nodes[i + 1]) ? ' ' : '';
          return c.nodeValue.replace(/\s+/g, ' ');
        }
        return render(c);
      }).join('');
    };
    if (tag === 'ul') return renderList(node, false);
    if (tag === 'ol') return renderList(node, true);
    if (!KEEP.has(tag)) return kids();

    const s = cs(node);
    const parent = node.parentElement;
    const ps = parent ? cs(parent) : null;
    const parts = [];
    const attrs = [];
    let lead = '';

    const fs = n(s.fontSize);
    const lh = n(s.lineHeight);
    if (!ps || n(ps.fontSize) !== fs) parts.push(`font-size:${fs}px;`);
    if (s.lineHeight !== 'normal' && (!ps || ps.lineHeight !== s.lineHeight)) parts.push(`line-height:${lh}px;`);
    const align = s.textAlign;
    const pAlign = ps ? ps.textAlign : 'left';
    if (align !== pAlign && align !== 'left' && align !== 'start') parts.push(`text-align:${align};`);
    const fw = parseInt(s.fontWeight, 10);
    if (fw >= 500) parts.push(`font-weight:${fw};`);
    else if (tag === 'b' || tag === 'strong') parts.push('font-weight:400;');
    if (s.color !== (ps ? ps.color : defaultColor)) parts.push(`color:${s.color};`);

    const margin = () => {
      const t = n(s.marginTop) || 0;
      const r = n(s.marginRight) || 0;
      const b = n(s.marginBottom) || 0;
      const l = n(s.marginLeft) || 0;
      if (t || r || b || l) parts.push(`margin:${t}px ${r}px ${b}px ${l}px;`);
    };

    switch (tag) {
      case 'p': {
        const inCell = !!node.closest('td,th');
        if (inCell) parts.push('margin:0;');
        else margin();
        if (node.closest('ul,ol') && s.lineHeight !== 'normal') parts.push(`line-height:${n(s.lineHeight)}px;`);
        if (pendingList) {
          const p = pendingList;
          pendingList = null;
          parts.push(p.extra);
          lead = p.marker;
        }
        break;
      }
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        margin();
        break;
      case 'li': {
        // Reached only for <li> outside a list; treat like a hanging bullet.
        margin();
        parts.push('padding-left:12px;text-indent:-12px;');
        break;
      }
      case 'table':
        parts.push('width:100%;border-collapse:collapse;table-layout:fixed;margin:10px 0 18px;');
        break;
      case 'td':
      case 'th': {
        // Merged rows are used for every principle/action heading. Dropping
        // colspan makes those headings occupy only the first column in rich-text.
        for (const name of ['colspan', 'rowspan']) {
          const value = node.getAttribute(name);
          if (value) attrs.push(`${name}="${value}"`);
        }
        const table = node.closest('table');
        const tw = table ? table.getBoundingClientRect().width : 0;
        if (node.parentElement === table.querySelector('tr') && tw) {
          const pct = Math.round((node.getBoundingClientRect().width / tw) * 1000) / 10;
          if (pct) parts.push(`width:${pct}%;`);
        }
        parts.push(borderSide(s, 'Top'), borderSide(s, 'Right'), borderSide(s, 'Bottom'), borderSide(s, 'Left'));
        if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') parts.push(`background-color:${s.backgroundColor};`);
        parts.push(`padding:${n(s.paddingTop) || 0}px ${n(s.paddingRight) || 0}px ${n(s.paddingBottom) || 0}px ${n(s.paddingLeft) || 0}px;`);
        parts.push(`vertical-align:${s.verticalAlign};`);
        break;
      }
      case 'a': {
        const href = node.getAttribute('href') || '';
        parts.push(`text-decoration:${s.textDecorationLine === 'none' ? 'none' : 'underline'};`);
        // The site clips over-long URLs inside narrow table cells; wrapping them keeps
        // the mini program page from scrolling sideways.
        parts.push('word-break:break-all;');
        return `<a href="${href}" style="${parts.join('')}">${kids()}</a>`;
      }
      case 'img': {
        const src = node.getAttribute('src') || '';
        const alt = (node.getAttribute('alt') || '').replace(/"/g, '&quot;');
        return `<img src="${src}" alt="${alt}" style="width:100%;height:auto;display:block;margin:10px 0;">`;
      }
      case 'br':
        return '<br>';
      default:
        break;
    }
    const style = parts.join('');
    const body = kids();
    const attrText = attrs.length ? ` ${attrs.join(' ')}` : '';
    return `<${tag}${attrText}${style ? ` style="${style}"` : ''}>${lead}${body}</${tag}>`;
  };
  return render(root).replace(/\s{2,}/g, ' ');
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA, isMobile: true, deviceScaleFactor: 2 });
for (const t of targets) {
  const page = await ctx.newPage();
  await page.goto('https://www.legaloneglobal.com' + t.url, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const html = await page.evaluate(builder, t.sel);
  fs.writeFileSync(t.out, '// Auto-generated from https://www.legaloneglobal.com' + t.url + '\n// Faithful markup (styles read from the rendered site) for <rich-text nodes="{{html}}">.\n// Regenerate with /tmp/lg-probe/gen-legal.mjs; do not hand-edit.\nmodule.exports = { html: ' + JSON.stringify(html) + ' };\n');
  const counts = { table: (html.match(/<table/g) || []).length, tr: (html.match(/<tr/g) || []).length, td: (html.match(/<td/g) || []).length, bold: (html.match(/font-weight:700/g) || []).length, li: (html.match(/<li[ >]/g) || []).length, img: (html.match(/<img/g) || []).length };
  console.log(t.url, '->', t.out, 'bytes:', html.length, JSON.stringify(counts));
  await page.close();
}
await browser.close();
