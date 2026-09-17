// Static snapshot fallback used when the live API is unreachable in the mini program.
// It mirrors the same normalized shape as services/api.js so pages can render either source.
const d = require('../data/content.js');

function img(name) {
  return name ? '/assets/img/' + name : '';
}

function lastSeg(link) {
  if (!link) return '';
  const clean = link.split('?')[0].replace(/\/+$/, '');
  const parts = clean.split('/');
  return parts[parts.length - 1] || '';
}

module.exports = {
  announcements: d.announcements.map(function (x, i) {
    return { id: lastSeg(x.link) || ('s-ann-' + i), type: x.title, headline: x.headline, image: '', url: x.link || '', date: '', descript: '' };
  }),
  deals: d.deals.map(function (x) {
    return { id: lastSeg(x.link), title: x.title, rank: x.rank, date: x.date };
  }),
  latestLawfirms: d.latestLawfirms.map(function (x) {
    return { id: lastSeg(x.link), name: x.name, image: img('watermark.png') };
  }),
  latestPartners: d.latestPartners.map(function (x) {
    return { id: lastSeg(x.link), name: x.name, image: '', positions: [], firm: '', location: '' };
  }),
  testimonials: d.testimonials.map(function (x, i) {
    return { id: lastSeg(x.link) || ('s-test-' + i), name: x.name, comment: x.comment, author: x.author, company: x.company };
  }),
  latest: d.latest.map(function (x) {
    return { id: lastSeg(x.link), title: x.title, image: img(x.image), labels: x.labels, author: x.author, date: x.date };
  }),
  awards: d.latest.filter(function (x) {
    const joined = ((x.labels || []).join(' ') + ' ' + x.title).toLowerCase();
    return joined.indexOf('award') >= 0 || joined.indexOf('blue ribbon') >= 0 || joined.indexOf('deals of the year') >= 0;
  }).map(function (x) {
    return { id: lastSeg(x.link), title: x.title, image: img(x.image), labels: x.labels, author: x.author, date: x.date };
  }),
  highlights: d.highlights.map(function (x) {
    return { id: lastSeg(x.link), title: x.title, image: img(x.image), labels: x.labels, author: x.author, date: x.date };
  }),
  lawyers: d.lawyers.map(function (x) {
    return { id: lastSeg(x.link), name: x.name, image: img(x.image), positions: x.positions, firm: x.firm, location: x.location };
  }),
  lawfirms: d.lawfirms.map(function (x) {
    return { id: lastSeg(x.link), name: x.name, image: img('watermark.png') };
  })
};
