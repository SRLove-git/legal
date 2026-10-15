// The website renders a CMS article as HTML: paragraphs with inline
// <strong>/<em>/<a>, bullet lists, inline pictures and a centred "- END -"
// marker. A mini program cannot hand that markup straight to <rich-text>:
// anchors inside it are not tappable, and this CMS stores inline pictures as
// base64 data URIs (this one article carries 1.4 MB of them), which alone blow
// past the 1 MB setData budget. Convert the HTML into the native blocks the
// article page renders instead.
//
// Award write-ups keep the <rich-text> path in services/rich-text.js because
// their league tables and winner cards depend on it, so api.js only calls this
// converter for plain articles.
const richText = require('./rich-text.js');

const ORIGIN = 'https://www.legaloneglobal.com';

// Width of the article column in CSS pixels. The website renders every body
// picture as a normal <img>, so the browser caps it at the column width
// (max-width:100%) while keeping its aspect ratio; a 500px infographic is 337px
// wide on a phone. Pictures that already fit keep the CMS's own pixel size, the
// way the inline 100px award badges do.
const COLUMN_WIDTH_PX = 339;

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c',
  ndash: '\u2013', mdash: '\u2014', hellip: '\u2026', middot: '\u00b7',
  bull: '\u2022', times: '\u00d7', deg: '\u00b0', copy: '\u00a9',
  reg: '\u00ae', trade: '\u2122', eacute: '\u00e9', egrave: '\u00e8'
};

// `<br>` survives whitespace collapsing as this sentinel.
const BREAK = '\u0000';

function decode(value) {
  return String(value == null ? '' : value)
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, function (whole, ref) {
      if (ref.charAt(0) === '#') {
        const hex = ref.charAt(1) === 'x' || ref.charAt(1) === 'X';
        const code = parseInt(hex ? ref.slice(2) : ref.slice(1), hex ? 16 : 10);
        return isNaN(code) ? whole : String.fromCharCode(code);
      }
      const key = ref.toLowerCase();
      return Object.prototype.hasOwnProperty.call(ENTITIES, key) ? ENTITIES[key] : whole;
    })
    .replace(/[\u00a0\u200b\ufeff]/g, ' ');
}

function attribute(attributes, name) {
  const pattern = new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i');
  const match = String(attributes || '').match(pattern);
  if (!match) return '';
  if (match[1] !== undefined) return match[1];
  if (match[2] !== undefined) return match[2];
  return match[3] || '';
}

function absolute(url) {
  // Shares the CMS URL rules with <rich-text>: the legacy Azure Blob host is
  // rewritten to the CDN the mini program is allowed to download from, and
  // paths containing spaces or ampersands are escaped.
  return richText.toAbsoluteAssetUrl(String(url || '').trim());
}

// Text runs keep their formatting so the page can render plain, bold, italic
// and tappable-link <text> nodes instead of one unwieldy rich-text blob.
function parseRuns(html, links) {
  const runs = [];
  const stack = [];
  let bold = 0;
  let italic = 0;
  let linkIndex = -1;

  const push = function (text) {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last.bold === (bold > 0) && last.italic === (italic > 0) && last.linkIndex === linkIndex) {
      last.text += text;
      return;
    }
    runs.push({ text: text, bold: bold > 0, italic: italic > 0, linkIndex: linkIndex });
  };

  const pattern = /<(span|strong|b|em|i|a)\b([^>]*)>|<\/(span|strong|b|em|i|a)\s*>|<br\s*\/?>|([^<]+)/gi;
  let match;
  while ((match = pattern.exec(html))) {
    if (match[3]) {
      const previous = stack.pop();
      if (previous) {
        bold = previous.bold;
        italic = previous.italic;
        linkIndex = previous.linkIndex;
      }
      continue;
    }
    if (match[1]) {
      const tag = match[1].toLowerCase();
      stack.push({ bold: bold, italic: italic, linkIndex: linkIndex });
      if (tag === 'strong' || tag === 'b') {
        bold += 1;
      } else if (tag === 'em' || tag === 'i') {
        italic += 1;
      } else if (tag === 'a') {
        const href = decode(attribute(match[2], 'href'));
        linkIndex = links.findIndex(function (link) { return link.url === href; });
      } else {
        const style = attribute(match[2], 'style');
        if (/font-weight\s*:\s*(?:bold|bolder|[6-9]00)/i.test(style)) bold += 1;
        if (/font-style\s*:\s*italic/i.test(style)) italic += 1;
      }
      continue;
    }
    if (/^<br/i.test(match[0])) {
      push(BREAK);
      continue;
    }
    push(decode(match[4]));
  }

  // HTML authors its whitespace for a browser; collapse it, then restore the
  // explicit line breaks and trim the ends of the paragraph.
  const parts = [];
  runs.forEach(function (run) {
    const text = run.text.replace(/[ \t\r\n]+/g, ' ');
    if (!text) return;
    const last = parts[parts.length - 1];
    if (last && last.bold === run.bold && last.italic === run.italic && last.linkIndex === run.linkIndex) {
      last.text += text;
      return;
    }
    parts.push({ text: text, bold: run.bold, italic: run.italic, linkIndex: run.linkIndex });
  });
  if (parts.length) {
    parts[0].text = parts[0].text.replace(/^[ ]+/, '');
    const tail = parts[parts.length - 1];
    tail.text = tail.text.replace(/[ ]+$/, '');
  }
  return parts
    .filter(function (part) { return part.text; })
    .map(function (part) {
      return {
        text: part.text.split(BREAK).join('\n').replace(/\n /g, '\n'),
        bold: part.bold,
        italic: part.italic,
        linkIndex: part.linkIndex
      };
    });
}

function imageBlock(attributes) {
  const src = absolute(decode(attribute(attributes, 'src')));
  if (!src) return null;
  const width = parseInt(attribute(attributes, 'width'), 10);
  const height = parseInt(attribute(attributes, 'height'), 10);
  // Only pictures that fit the column keep their declared size; anything wider
  // fills the column with its own aspect ratio, like the browser does.
  const sized = width > 0 && width <= COLUMN_WIDTH_PX;
  return {
    type: 'image',
    src: src,
    width: sized ? width : 0,
    height: sized ? height : 0
  };
}

function paragraphBlock(inner, attributes, links) {
  const parts = parseRuns(inner, links);
  if (!parts.length) return null;
  const style = attribute(attributes, 'style') + ' ' + attribute(attributes, 'align');
  return {
    type: 'paragraph',
    align: /text-align\s*:\s*center|align\s*[:=]\s*["']?\s*center/i.test(style) ? 'center' : '',
    parts: parts
  };
}

// A paragraph can hold nothing but pictures, or a sentence followed by one.
function splitOnImages(inner, attributes, links) {
  const out = [];
  const images = /<img\b([^>]*?)\/?>/gi;
  let cursor = 0;
  let buffer = '';
  let match;
  while ((match = images.exec(inner))) {
    buffer += inner.slice(cursor, match.index);
    cursor = images.lastIndex;
    const paragraph = paragraphBlock(buffer, attributes, links);
    if (paragraph) out.push(paragraph);
    buffer = '';
    const image = imageBlock(match[1]);
    if (image) out.push(image);
  }
  buffer += inner.slice(cursor);
  const paragraph = paragraphBlock(buffer, attributes, links);
  if (paragraph) out.push(paragraph);
  return out;
}

function listBlock(inner, links, ordered) {
  const items = [];
  const entries = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = entries.exec(inner))) {
    const parts = parseRuns(match[1], links);
    if (parts.length) items.push({ parts: parts });
  }
  if (!items.length) return null;
  return { type: 'list', ordered: !!ordered, items: items };
}

function findClose(source, tag, from) {
  const open = new RegExp('<' + tag + '\\b', 'gi');
  const close = new RegExp('</' + tag + '\\s*>', 'gi');
  let depth = 1;
  let cursor = from;
  while (cursor < source.length) {
    open.lastIndex = cursor;
    close.lastIndex = cursor;
    const nextOpen = open.exec(source);
    const nextClose = close.exec(source);
    if (!nextClose) return null;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      cursor = nextOpen.index + nextOpen[0].length;
      continue;
    }
    depth -= 1;
    // The offset lives on the RegExp, not on the match array.
    if (depth === 0) return { start: nextClose.index, end: close.lastIndex };
    cursor = close.lastIndex;
  }
  return null;
}

function finalize(blocks) {
  blocks.forEach(function (block, index) {
    block.id = 'b' + index;
    if (block.parts) {
      block.parts.forEach(function (part, partIndex) { part.id = block.id + '-r' + partIndex; });
    }
    if (block.items) {
      block.items.forEach(function (item, itemIndex) {
        item.id = block.id + '-i' + itemIndex;
        item.parts.forEach(function (part, partIndex) { part.id = item.id + '-r' + partIndex; });
      });
    }
  });
  return blocks;
}

function toBlocks(html, externalLinks) {
  const links = (externalLinks || []).filter(function (link) { return link && link.url; });
  const source = String(html || '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  if (!source.trim()) return [];
  // Layouts that only <rich-text> can reproduce (league tables, responsive
  // pictures, embeds) keep the existing renderer.
  if (/<table\b|<iframe\b|<picture\b|doty-table/i.test(source)) return [];

  const blocks = [];
  const pattern = /<(p|ul|ol|h[1-6]|blockquote|img)\b([^>]*?)(\/?)>/gi;
  let pending = '';
  let cursor = 0;
  let match;

  const flushText = function () {
    const text = pending;
    pending = '';
    const paragraph = paragraphBlock(text, '', links);
    if (paragraph) blocks.push(paragraph);
  };

  while ((match = pattern.exec(source))) {
    if (match.index > cursor) pending += source.slice(cursor, match.index);
    const tag = match[1].toLowerCase();
    if (tag === 'img' || /\/\s*$/.test(match[2])) {
      if (tag === 'img') {
        flushText();
        const image = imageBlock(match[2]);
        if (image) blocks.push(image);
      }
      cursor = pattern.lastIndex;
      continue;
    }
    const close = findClose(source, tag, pattern.lastIndex);
    if (!close) {
      cursor = pattern.lastIndex;
      continue;
    }
    const inner = source.slice(pattern.lastIndex, close.start);
    cursor = close.end;
    pattern.lastIndex = close.end;
    flushText();
    if (tag === 'ul' || tag === 'ol') {
      const list = listBlock(inner, links, tag === 'ol');
      if (list) blocks.push(list);
    } else {
      splitOnImages(inner, match[2], links).forEach(function (block) { blocks.push(block); });
    }
  }
  if (cursor < source.length) pending += source.slice(cursor);
  flushText();
  return finalize(blocks);
}

module.exports = { toBlocks: toBlocks, decode: decode };
