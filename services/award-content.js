// Award write-ups keep their "LIST OF WINNERS" block in a separate CMS field
// (awardContent) that mixes Handlebars placeholders, READY-MADE HTML and the
// website's collapse/expand buttons. The mini program renders the winner cards
// natively and hands the surrounding markup (for example the Deals of the Year
// league tables) to <rich-text>.
const richText = require('./rich-text.js');

const BLOB = 'https://legaloneglobal.azureedge.net/storelegaloneglobalpub/';
// The website serves a portrait crop to phones (its <source media="(max-width:
// 27.5em)"> entry), which is the card the readers of the mini program see.
const PHOTO_FILE = '396-462';
const PLAIN_FILE = '396-264';
const WINNER_ANCHOR = /<div class="sa-lawyer(?![-\w])[^"]*">/g;

function decodeEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '\u2013', mdash: '\u2014', lsquo: '\u2018', rsquo: '\u2019',
    ldquo: '\u201c', rdquo: '\u201d', hellip: '\u2026'
  };
  return String(value === null || value === undefined ? '' : value)
    // The CMS occasionally writes entities without the trailing semicolon.
    .replace(/&nbsp/gi, ' ')
    .replace(/&amp/gi, '&')
    .replace(/&quot/gi, '"')
    .replace(/&#(\d+);/g, function (whole, code) {
      const point = Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
    })
    .replace(/&#x([\da-f]+);/gi, function (whole, code) {
      const point = parseInt(code, 16);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
    })
    .replace(/&([a-z]+);/gi, function (whole, name) {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(named, key) ? named[key] : whole;
    });
}

function toText(value) {
  return decodeEntities(String(value === null || value === undefined ? '' : value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(value, pattern) {
  const match = String(value || '').match(pattern);
  return match ? match[1] : '';
}

// {{getBloburl}} is the CDN root; {{getBlobImage base "path" "ext" "alt"}}
// expands to the responsive <picture> that app.js builds on the website.
function resolvePlaceholders(html) {
  return String(html)
    .replace(/\{\{\s*getBloburl\s*\}\}/g, BLOB)
    .replace(/\{\{\s*getBlobImage\s+[^}]*?"([^"]+)"\s+"([\w]+)"\s*(?:"([^"]*)")?\s*\}\}/gi,
      function (whole, path, ext, alt) {
        const file = /PlainBackground$/.test(path) ? PLAIN_FILE : PHOTO_FILE;
        return '<img src="' + BLOB + path + '/' + file + '.' + ext + '"' +
          (alt ? ' alt="' + alt + '"' : '') + ' />';
      })
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}

// Returns the element that starts at `start` together with the index just past
// its closing </div>, so each winner block can be cut out of the surrounding
// markup without a full HTML parser.
function sliceElement(html, start) {
  const pattern = /<(\/?)div\b[^>]*>/gi;
  pattern.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = pattern.exec(html))) {
    if (match[1]) {
      depth -= 1;
      if (depth === 0) return { html: html.slice(start, pattern.lastIndex), end: pattern.lastIndex };
    } else {
      depth += 1;
    }
  }
  return { html: html.slice(start), end: html.length };
}

// Firm and city sit in the left column, the T:/M:/E: lines in the right one.
function parseItems(chunk) {
  const items = [];
  const pattern = /class="sa-(?:lawyer-detail-item|lawyer-detail-empty-item|counsel-title-item)"[^>]*>([\s\S]*?)<\/span>/gi;
  let match;
  while ((match = pattern.exec(chunk))) {
    const value = toText(match[1]);
    if (value) items.push(value);
  }
  return items;
}

function parseWinner(chunk) {
  const items = parseItems(chunk);
  const profileBlock = firstMatch(chunk, /<(?:div|span) class="view-profile[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)>/i);
  const href = firstMatch(chunk, /<a[^>]+href="([^"]+)"[^>]*>/i);
  const profile = href.match(/^\/?profile\/(lawyers|lawfirms)\/(.+)$/i);
  const bio = firstMatch(chunk, /class="stellarAccoladeContent[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const bioText = toText(bio);
  return {
    name: toText(firstMatch(chunk, /class="sa-lawyer-detail-name[^"]*"[^>]*>([\s\S]*?)<\/div>/i)),
    secondName: toText(firstMatch(chunk, /class="[^"]*second-name[^"]*"[^>]*>([\s\S]*?)<\/div>/i)),
    photo: firstMatch(chunk, /<img[^>]+src="([^"]+)"/i),
    profileImg: firstMatch(profileBlock, /<img[^>]+src="([^"]+)"/i),
    profileKind: profile ? profile[1].toLowerCase() : '',
    profileId: profile ? profile[2] : '',
    firm: items[0] || '',
    city: items[1] || '',
    contacts: items.slice(2),
    hasBio: !!bioText,
    bioLong: /blue-ribbon-expandButton/i.test(chunk) || bioText.length > 180,
    bioHtml: bioText ? richText.toRichHtml(bio) : ''
  };
}

function parseBlocks(body) {
  const blocks = [];
  let cursor = 0;
  const pushHtml = function (html) {
    if (!toText(html) && !/<img\b/i.test(html)) return;
    const last = blocks[blocks.length - 1];
    if (last && last.type === 'html') last.html += html;
    else blocks.push({ id: 'html-' + blocks.length, type: 'html', html: html });
  };
  const anchor = new RegExp(WINNER_ANCHOR.source, 'g');
  let match;
  while ((match = anchor.exec(body))) {
    if (match.index < cursor) continue;
    pushHtml(body.slice(cursor, match.index));
    const element = sliceElement(body, match.index);
    const winner = parseWinner(element.html);
    if (winner.name || winner.photo) {
      blocks.push({ id: 'winner-' + blocks.length, type: 'winner', winner: winner });
    } else {
      pushHtml(element.html);
    }
    cursor = element.end;
    anchor.lastIndex = element.end;
  }
  pushHtml(body.slice(cursor));

  blocks.forEach(function (block) {
    if (block.type !== 'html') return;
    const raw = block.html;
    const rich = richText.toRichHtml(raw);
    block.html = rich;
    block.text = rich ? '' : toText(raw);
  });
  return blocks;
}

// The website initially shows only its practice-area rows. Each row owns one
// hidden div containing that area's winner cards and expands independently.
function parseRegions(body) {
  const regions = [];
  const outside = [];
  const pattern = /(<p\b[^>]*class="[^"]*\bstellarAccoladeRegion\b[^"]*"[^>]*>([\s\S]*?)<\/p>)\s*(<div\b[^>]*class="[^"]*\bstellarAccoladeRegionContentHidden\b[^"]*"[^>]*>)/gi;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(body))) {
    if (match.index < cursor) continue;
    outside.push(body.slice(cursor, match.index));
    const divStart = match.index + match[0].length - match[3].length;
    const element = sliceElement(body, divStart);
    const inner = element.html
      .replace(/^<div\b[^>]*>/i, '')
      .replace(/<\/div>\s*$/i, '');
    const blocks = parseBlocks(inner);
    regions.push({
      id: 'region-' + regions.length,
      name: toText(match[2]),
      open: false,
      blocks: blocks
    });
    cursor = element.end;
    pattern.lastIndex = cursor;
  }
  outside.push(body.slice(cursor));
  return {
    regions: regions,
    before: outside.shift() || '',
    after: outside.join('')
  };
}

// Some Blue Ribbon write-ups place several profile-backed winners in a grey
// "Featured" panel, followed by the remaining winners on the normal page
// background. Preserve that wrapper instead of flattening all cards together.
function parseFeatured(body) {
  const pattern = /<div\b[^>]*style="[^"]*background\s*:\s*#ececec[^"]*"[^>]*>\s*<p\b[^>]*class="[^"]*\bstellarAccoladeFeature\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i;
  const match = pattern.exec(body);
  if (!match) return null;
  const element = sliceElement(body, match.index);
  const inner = element.html
    .replace(/^<div\b[^>]*>/i, '')
    .replace(/<p\b[^>]*class="[^"]*\bstellarAccoladeFeature\b[^"]*"[^>]*>[\s\S]*?<\/p>/i, '')
    .replace(/<\/div>\s*$/i, '');
  return {
    title: toText(match[1]) || 'Featured',
    before: body.slice(0, match.index),
    content: inner,
    after: body.slice(element.end)
  };
}

function parseAwardContent(html) {
  if (!html) return null;
  const resolved = resolvePlaceholders(html);
  const title = toText(firstMatch(resolved, /class="blue-ribbon-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i)) ||
    toText(firstMatch(resolved, /<label[^>]*>([\s\S]*?)<\/label>/i));
  const body = resolved.replace(/<div class="blue-ribbon-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i, '');

  const grouped = parseRegions(body);
  const regions = grouped.regions;
  const featured = regions.length ? null : parseFeatured(body);
  const leadBlocks = featured ? parseBlocks(featured.before) : [];
  const blocks = regions.length ? parseBlocks(grouped.before) : parseBlocks(featured ? featured.after : body);
  const afterBlocks = regions.length ? parseBlocks(grouped.after) : [];
  const featuredBlocks = featured ? parseBlocks(featured.content) : [];
  const regionWinnerCount = regions.reduce(function (total, region) {
    return total + region.blocks.filter(function (block) { return block.type === 'winner'; }).length;
  }, 0);
  const winnerCount = regionWinnerCount ||
    blocks.concat(featuredBlocks).filter(function (block) { return block.type === 'winner'; }).length;
  return {
    title: title,
    leadBlocks: leadBlocks,
    blocks: blocks,
    afterBlocks: afterBlocks,
    featured: featured ? { title: featured.title, blocks: featuredBlocks } : null,
    regions: regions,
    winnerCount: winnerCount
  };
}

module.exports = { parseAwardContent: parseAwardContent, resolvePlaceholders: resolvePlaceholders };
