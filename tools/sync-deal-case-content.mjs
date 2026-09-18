import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://www.legaloneglobal.com';
const PAGE_URL = ORIGIN + '/deal_case_introduction';

function decodeEntities(value) {
  const named = {
    amp: '&', apos: "'", gt: '>', hellip: '…', ldquo: '“', lsquo: '‘',
    lt: '<', mdash: '—', nbsp: ' ', ndash: '–', quot: '"', rdquo: '”', rsquo: '’'
  };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all);
}

function cleanText(html) {
  return decodeEntities(html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeJsString(raw) {
  return raw
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function templateContaining(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Template marker not found: ${marker}`);
  const returnIndex = source.lastIndexOf("return'", markerIndex);
  if (returnIndex < 0) throw new Error(`Template start not found: ${marker}`);
  const start = returnIndex + 7;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === "'") return decodeJsString(source.slice(start, i));
  }
  throw new Error(`Template end not found: ${marker}`);
}

function matchOne(html, pattern, label) {
  const match = html.match(pattern);
  if (!match) throw new Error(`Missing ${label}`);
  return match[1];
}

function parseMethodology(html) {
  const panels = [...html.matchAll(/<div class="[^"]*\babout-panel\b[^"]*">([\s\S]*?)<\/div>/g)].map((match) => {
    const body = match[1];
    return {
      title: cleanText(matchOne(body, /<p class="about-feature-label">([\s\S]*?)<\/p>/, 'methodology title')),
      text: cleanText(body.replace(/<p class="about-feature-label">[\s\S]*?<\/p>/, ''))
    };
  });
  if (panels.length !== 5) throw new Error(`Expected 5 methodology panels, found ${panels.length}`);
  return { cards: panels.slice(0, 4), merits: panels[4] };
}

function localImage(src) {
  const filename = src.split('/').pop();
  return `/assets/img/deal-case/${filename.replace(/\.png$/i, '.jpg')}`;
}

function parseDoty(html) {
  const cards = [...html.matchAll(/<article class="deals-doty-feature-card[^>]*>([\s\S]*?)<\/article>/g)];
  const features = cards.slice(0, 2).map((match) => {
    const body = match[1];
    return {
      title: cleanText(matchOne(body, /class="deals-doty-feature-card-title">([\s\S]*?)<\/h2>/, 'feature title')),
      description: '',
      image: localImage(matchOne(body, /<img[^>]+src="([^"]+)"/, 'feature image')),
      webUrl: ORIGIN + matchOne(body, /<a[^>]+href="([^"]+)"/, 'feature link')
    };
  });
  const archive = cards[2] && cards[2][1];
  if (!archive || features.length !== 2) throw new Error('Incomplete Deals of the Year template');
  return {
    intro: cleanText(matchOne(html, /class="about-archive-description">([\s\S]*?)<\/p>/, 'DOTY introduction')),
    features,
    archive: {
      title: 'LegalOne Deals of the Year in Libraries Worldwide',
      description: cleanText(matchOne(archive, /class="deals-doty-feature-card-desc">([\s\S]*?)<\/p>/, 'archive description')),
      image: localImage(matchOne(archive, /<img[^>]+src="([^"]+)"/, 'archive image')),
      map: localImage(matchOne(html, /class="about-archive-map-image"[\s\S]*?src="([^"]+)"/, 'archive map'))
    }
  };
}

function parseFaq(html) {
  const sections = [...html.matchAll(/<section class="deal-faq-section"[^>]*>([\s\S]*?)<\/section>/g)];
  const groups = sections.map((section, groupIndex) => {
    const body = section[1];
    const title = cleanText(matchOne(body, /class="deal-faq-section-title">([\s\S]*?)<\/h2>/, 'FAQ group title'));
    const items = [...body.matchAll(/<article class="deal-faq-item">([\s\S]*?)<\/article>/g)].map((item, itemIndex) => {
      const itemBody = item[1];
      const question = cleanText(matchOne(itemBody, /class="deal-faq-question-text">([\s\S]*?)<\/span>/, 'FAQ question'));
      const numberMatch = question.match(/^(Q\d+:)\s*/);
      return {
        id: `faq-${groupIndex + 1}-${itemIndex + 1}`,
        number: numberMatch ? numberMatch[1] : '',
        question: question.replace(/^Q\d+:\s*/, ''),
        answer: cleanText(matchOne(itemBody, /class="deal-faq-answer"[^>]*>([\s\S]*?)<\/div>/, 'FAQ answer'))
      };
    });
    return { title, items };
  });
  const count = groups.reduce((sum, group) => sum + group.items.length, 0);
  if (groups.length !== 7 || count !== 20) throw new Error(`Expected 7 FAQ groups / 20 questions, found ${groups.length} / ${count}`);
  return groups;
}

const pageHtml = await fetch(PAGE_URL).then((response) => response.text());
const appPath = matchOne(pageHtml, /<script src="(\/app\.js\?v=[^"]+)"/, 'app bundle');
const source = await fetch(ORIGIN + appPath).then((response) => response.text());
const introHtml = templateContaining(source, 'class="deal-case-intro-page"');
const dotyHtml = templateContaining(source, 'class="deals-doty-showcase"');
const faqHtml = templateContaining(source, 'class="deal-faq-section"');

const data = {
  methodology: parseMethodology(introHtml),
  doty: parseDoty(dotyHtml),
  faq: parseFaq(faqHtml)
};

const outputPath = path.resolve('data/deal-case-intro.js');
const output = [
  `// Auto-generated from ${PAGE_URL}`,
  '// Run: node tools/sync-deal-case-content.mjs',
  `module.exports = ${JSON.stringify(data, null, 2)};`,
  ''
].join('\n');
fs.writeFileSync(outputPath, output, 'utf8');

console.log(JSON.stringify({
  output: outputPath,
  methodologyCards: data.methodology.cards.length,
  dotyCards: data.doty.features.length,
  faqGroups: data.faq.length,
  faqQuestions: data.faq.reduce((sum, group) => sum + group.items.length, 0)
}));
