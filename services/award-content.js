// Award write-ups keep their "LIST OF WINNERS" block in a separate CMS field
// (awardContent) that mixes Handlebars placeholders, READY-MADE HTML and the
// website's collapse/expand buttons. The mini program renders the winner cards
// natively and hands the surrounding markup (for example the Deals of the Year
// league tables) to <rich-text>.
const richText = require('./rich-text.js');

const BLOB = 'https://legaloneglobal.azureedge.net/storelegaloneglobalpub/';
// The website's card artwork ("970-270", the <img> its getBlobImage helper
// writes) is the wide banner the profile cards are laid out for.
const PHOTO_FILE = '970-270';
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
        // The helper's own <img> is always the wide 970-270 crop, for the plain
        // background card as well.
        return '<img src="' + BLOB + path + '/' + PHOTO_FILE + '.' + ext + '"' +
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
    hasBio: !!bio,
    // Roughly six lines of body copy, which is where the website clamps and
    // starts showing its "Continue reading" button.
    bioLong: bioText.length > 320,
    bioHtml: bio ? richText.toRichHtml(bio) : ''
  };
}

function parseAwardContent(html) {
  if (!html) return null;
  const resolved = resolvePlaceholders(html);
  const title = toText(firstMatch(resolved, /class="blue-ribbon-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i)) ||
    toText(firstMatch(resolved, /<label[^>]*>([\s\S]*?)<\/label>/i));
  const body = resolved.replace(/<div class="blue-ribbon-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i, '');

  // Cut the winner blocks out of the body so what is left over can be rendered
  // as rich text (league tables, headings, article images).
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
    if (winner.name || winner.photo) blocks.push({ id: 'winner-' + blocks.length, type: 'winner', winner: winner });
    else pushHtml(element.html);
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
  return {
    title: title,
    blocks: blocks,
    winnerCount: blocks.filter(function (block) { return block.type === 'winner'; }).length
  };
}

module.exports = { parseAwardContent: parseAwardContent, resolvePlaceholders: resolvePlaceholders };
