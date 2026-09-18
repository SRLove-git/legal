// LegalOne Global — mini program API service.
// Reference: Technical Annex A (Phase 1 public browse) + Annex B (Phase 2 login).
const config = require('../config.js');
const richText = require('./rich-text.js');
const awardContent = require('./award-content.js');
const BASE = config.baseUrl || 'https://www.legaloneglobal.com/';
const CDN = 'https://legaloneglobal.azureedge.net/storelegaloneglobalpub/';

function storageGet(key) {
  try { return wx.getStorageSync(key); } catch (e) { return ''; }
}

function authHeaders(extra) {
  const h = Object.assign({}, extra || {});
  const token = storageGet('X-ACCESS-TOKEN');
  if (token) h['X-ACCESS-TOKEN'] = token;
  return h;
}

function request(method, path, options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    wx.request({
      url: BASE + path,
      method: method,
      data: options.data,
      header: options.auth ? authHeaders(options.headers || {}) : (options.headers || {}),
      success: function (res) {
        const body = res.data;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Annex B §1.2: failed responses use { code: 0, description, captchaVerifyResult }
          if (body && typeof body === 'object' && !Array.isArray(body) &&
              Object.prototype.hasOwnProperty.call(body, 'code') && body.code === 0 && body.description) {
            reject(toApiError(body.description, body, res.statusCode));
            return;
          }
          resolve(body);
        } else {
          const msg = (body && (body.description || body.message)) || ('HTTP ' + res.statusCode);
          reject(toApiError(msg, body, res.statusCode));
        }
      },
      fail: function (e) {
        const err = new Error((e && e.errMsg) || 'Network error');
        err.network = true;
        reject(err);
      }
    });
  });
}

function toApiError(message, body, statusCode) {
  const err = new Error(message);
  if (body && typeof body === 'object') {
    err.code = body.code;
    err.description = body.description;
    err.captchaVerifyResult = body.captchaVerifyResult;
  }
  err.statusCode = statusCode;
  return err;
}

function get(path, options) {
  return request('GET', path, options);
}

function post(path, options) {
  options = options || {};
  options.headers = Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, options.headers || {});
  return request('POST', path, options);
}

function remove(path, options) {
  return request('DELETE', path, options);
}

// The API only accepts the literal brace form. Percent-encoded braces
// ("page=%7Bmax:12,start:1%7D") are rejected with HTTP 500, which is what the
// website sends too, so the query keeps the braces verbatim.
function encodePage(max, start) {
  return 'page={max:' + max + ',start:' + start + '}';
}

function encodePageCapital(max, start) {
  return 'Page={Max:' + max + ',Start:' + start + '}';
}

// Multi-value list filters (countries / categories) travel as one
// comma-separated, percent-encoded parameter, exactly like the website sends
// them from its SORT & FILTER panel.
function encodeValueList(values) {
  const list = Array.isArray(values) ? values : String(values || '').split(',');
  return list
    .map(function (value) { return encodeURIComponent(String(value).trim()); })
    .filter(Boolean)
    .join(',');
}

// Shared loader for profile sub-lists (cases / articles / lawyers / partners / honours).
// Defaults to the profile embed short size (5) per Annex A §1.2.
function listSub(basePath, opts, mapFn) {
  opts = opts || {};
  let q = basePath;
  q += (q.indexOf('?') >= 0 ? '&' : '?') + encodePage(opts.max || 5, opts.start || 1);
  if (opts.search) q += '&search=' + encodeURIComponent(opts.search);
  return get(q).then(function (r) {
    return (r || []).map(mapFn);
  });
}

// The website's profile embeds read their page size from the path
// (".../cases/5"). The query-string form answers with a different payload for
// some collections, so profile pages use the same shape the website does.
function embedSub(basePath, opts, mapFn) {
  opts = opts || {};
  return get(basePath + '/' + (opts.max || 5)).then(function (r) {
    return (r || []).map(mapFn);
  });
}

// Some CMS fields are HTML-encoded even though the clients render them as
// plain text. Decode named, decimal and hexadecimal entities before WXML sees
// them, including the occasional double-encoded value.
function decodeEntities(value) {
  if (value === null || value === undefined) return '';
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…'
  };
  let text = String(value);
  for (let pass = 0; pass < 3 && /&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(text); pass += 1) {
    text = text.replace(/&#(\d+);/g, function (whole, code) {
      const point = Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
    }).replace(/&#x([\da-f]+);/gi, function (whole, code) {
      const point = parseInt(code, 16);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
    }).replace(/&([a-z]+);/gi, function (whole, name) {
      const key = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(named, key) ? named[key] : whole;
    });
  }
  return text;
}

function stripHtml(html) {
  if (!html) return '';
  const text = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return decodeEntities(text);
}

function imageUrl(relative, size) {
  if (!relative) return '';
  if (/^https?:\/\//i.test(relative)) return relative;
  let path = relative;
  if (size) {
    const m = path.match(/^(.*?)_[a-z](\.[a-z0-9]+)$/i);
    if (m) {
      path = m[1] + '_' + size + m[2];
    } else {
      const dot = path.lastIndexOf('.');
      if (dot > 0) path = path.slice(0, dot) + size + path.slice(dot);
    }
  }
  return CDN + path;
}

function monthYear(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[d.getMonth()] + ', ' + d.getFullYear();
}

function dateOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// The website prints list/detail dates as "September 11, 2026".
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fullDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

// Website window.distinguished / exemplary / remarkable (app.js showRankingLabel).
const RANK_LABELS = { 3: 'Remarkable', 2: 'Exemplary', 1: 'Distinguished' };

function rankLabel(rank) {
  return RANK_LABELS[rank] || ('Rank ' + rank);
}

function normalizeDeal(d) {
  const jurisdictions = (d.relatedJurisdictions || []).map(function (x) {
    return decodeEntities((x && (x.name || x.country)) || x);
  }).filter(function (v, i, arr) { return v && arr.indexOf(v) === i; }).join('; ');
  return {
    id: d.id,
    title: decodeEntities(d.headline),
    rank: rankLabel(d.rank),
    // Numeric rank kept so callers can pick the matching merits badge.
    rankNo: Number(d.rank) || 0,
    // The API repeats industries; the website prints each label once, up to three.
    labels: (d.relatedIndustries || []).map(function (x) { return decodeEntities((x && x.area) || ''); })
      .filter(function (v, i, arr) { return v && arr.indexOf(v) === i; })
      .slice(0, 3),
    // The website's deal cards print "Date: December, 2025" and "Updated: <moddttm>".
    date: d.completedDateTime ? monthYear(d.completedDateTime) : '',
    completed: d.completedDateTime ? monthYear(d.completedDateTime) : '',
    jurisdictionText: jurisdictions,
    updated: d.moddttm ? fullDate(d.moddttm) : '',
    raw: d
  };
}

function normalizeLawfirm(f) {
  return {
    id: f.id,
    name: decodeEntities(f.name),
    image: imageUrl(f.profileIcon, 'm'),
    raw: f
  };
}

function normalizeLawyer(l) {
  const office = (l.lawFirm && l.lawFirm.lawFirmOffices && l.lawFirm.lawFirmOffices[0]) || {};
  const location = [office.city, office.country].filter(Boolean).map(decodeEntities).join(', ');
  const contacts = (l.contacts || []).filter(function (contact) {
    return contact && contact.published !== false && ['Phone', 'Mobile', 'Email'].indexOf(contact.type) >= 0;
  }).map(function (contact) {
    return { type: decodeEntities(contact.type), detail: decodeEntities(contact.detail) };
  });
  const verified = !!(l.isVerified || (l.verifications || []).some(function (verification) {
    return verification && (verification.status || '').toUpperCase() === 'VERIFIED';
  }));
  return {
    id: l.id,
    name: [l.firstName, l.name].filter(Boolean).map(decodeEntities).join(' '),
    firstName: decodeEntities(l.firstName),
    surname: decodeEntities(l.name),
    nameLocal: decodeEntities(l.nameLocal),
    image: imageUrl(l.profileIcon, 'm'),
    positions: [l.primaryTitle, l.secondaryTitle].filter(Boolean).map(decodeEntities),
    firm: decodeEntities((l.lawFirm && l.lawFirm.name) || l.functionInstitute || ''),
    firmId: (l.lawFirm && l.lawFirm.id) || '',
    location: location,
    contacts: contacts,
    verified: verified,
    numOfDeal: Number(l.numOfDeal) || 0,
    distinguished: Number(l.rank1Total) || 0,
    exemplary: Number(l.rank2Total) || 0,
    remarkable: Number(l.rank3Total) || 0,
    testimonials: Number(l.numRating) || 0,
    raw: l
  };
}

function normalizeCodeList(response) {
  const groups = Array.isArray(response) ? response : [response];
  const values = [];
  groups.forEach(function (group) {
    (group && group.contents || []).forEach(function (item) {
      const value = decodeEntities(item && item.code);
      if (value && values.indexOf(value) < 0) values.push(value);
    });
  });
  return values;
}

function normalizeTestimonial(t) {
  const author = [t.clientName, t.clientTitle].filter(Boolean).map(decodeEntities).join(', ');
  return {
    id: t.id,
    name: decodeEntities(t.lawyerName),
    comment: decodeEntities(t.comment),
    author: author,
    company: decodeEntities(t.clientCompanyName),
    date: fullDate(t.adddttm),
    raw: t
  };
}

// The website prints a firm's honours as "<lawyer> - <award>" linking to the
// award write-up. The endpoint returns one row per lawyer/award pair.
function normalizeHonour(h) {
  const lawyers = (h.lawyers || []).map(function (l) { return decodeEntities(l && l.name); }).filter(Boolean);
  return {
    id: h.articleId || '',
    articleId: h.articleId || '',
    name: decodeEntities(h.name) || lawyers.join(', '),
    awardName: decodeEntities(h.awardName),
    date: h.publishDate ? monthYear(h.publishDate) : ''
  };
}

function normalizeAdvertisement(ad) {
  return {
    id: ad.id || '',
    image: imageUrl(ad.advImage),
    link: ad.link || ''
  };
}

function normalizeArticle(a) {
  const authors = (a.authors || []).map(function (x) {
    return [x.firstName, x.name].filter(Boolean).map(decodeEntities).join(' ').trim();
  }).filter(Boolean);
  // The website's cards print "Updated: <moddttm>" (not the publish date).
  const updated = a.moddttm || a.publishDate;
  return {
    id: a.id,
    refNo: decodeEntities(a.refNo),
    title: decodeEntities(a.headline),
    image: imageUrl(a.image, 'l'),
    labels: (a.categories || []).map(function (c) { return decodeEntities(c.id || c); }),
    // The website picks the detail breadcrumb from this (Awards vs Articles).
    section: decodeEntities(a.section),
    author: authors.join(', '),
    date: fullDate(updated),
    publishedDate: fullDate(a.publishDate),
    updatedDate: fullDate(updated),
    publishedISO: a.publishDate ? dateOnly(a.publishDate) : '',
    doi: a.doi || '',
    doiUrl: a.doi ? 'https://doi.org/10.62436/' + a.doi : '',
    raw: a
  };
}

function normalizeAnnouncement(n) {
  const updated = n.moddttm || n.publishDate;
  return {
    id: n.id,
    type: n.title || (n.type === 0 ? 'Deal Announcement' : 'Announcement'),
    headline: n.headline || '',
    image: imageUrl(n.image, 'x'),
    url: n.url || '',
    date: fullDate(updated),
    publishedDate: fullDate(n.publishDate),
    updatedDate: fullDate(updated),
    descript: stripHtml(n.descript),
    raw: n
  };
}

// Annex B §8.1 — submission status label (deal & award)
function submissionStatus(status) {
  const s = Number(status);
  if (s === 1) return 'Incomplete';
  if (s === 2) return 'Submitted';
  return 'Status unavailable';
}

// Annex B §8.2 — verification status label (display only, no payment in mini program)
function verificationStatus(status, paymentStatus) {
  const ps = (paymentStatus || '').toString().toUpperCase();
  const st = (status || '').toString().toUpperCase();
  if (!ps) return 'Payment incomplete';
  if (ps === 'PENDING') return 'Payment pending';
  if (ps === 'FAILED' || ps === 'REJECTED' || ps === 'EXPIRED') return 'Payment failed';
  if (ps === 'SUCCEEDED') {
    if (st === 'PENDING') return 'Processing';
    if (st === 'VERIFIED') return 'Verified';
    if (st === 'REJECTED') return 'Rejected';
  }
  return 'Status unavailable';
}

// Annex B §8.3 — verification number helper (website typo "Verificatio" preserved)
function showVerificationNumber(status, id) {
  return (status || '').toString().toUpperCase() === 'VERIFIED' ? (id || '') : '';
}

// Annex B §9.4 — H5 form URL for a created submission
function formUrl(host, formType, formSubType, id) {
  const base = (host || BASE).replace(/\/+$/, '');
  if (formType === 'award-submission') {
    return base + '/form/award-submission/' + formSubType + '/index.html?id=' + encodeURIComponent(id);
  }
  return base + '/form/deal-submission/index.html?id=' + encodeURIComponent(id);
}

const api = {
  BASE: BASE,
  CDN: CDN,
  imageUrl: imageUrl,
  decodeEntities: decodeEntities,
  stripHtml: stripHtml,

  // Phase 1 — home
  getAnnouncements: function (opts) {
    opts = opts || {};
    let q = 'api/crm/announcements/tops?';
    q += (opts.start > 1) ? encodePage(opts.max || 12, opts.start) : encodePageCapital(opts.max || 12, 1);
    q += '&orderby=latest';
    if (opts.search) q += '&search=' + encodeURIComponent(opts.search);
    return get(q).then(function (r) {
      return (r || []).map(normalizeAnnouncement);
    });
  },
  getHomeDeals: function () {
    return get('api/legal/deals?' + encodePage(10, 1) + '&minscore=1&orderby=latest&scope=brief').then(function (r) {
      return (r || []).map(normalizeDeal);
    });
  },
  getHomeLawfirms: function () {
    return get('api/legal/lawfirms/?orderby=latestns&' + encodePage(10, 1) + '&scope=brief').then(function (r) {
      return (r || []).map(normalizeLawfirm);
    });
  },
  getHomePartners: function () {
    return get('api/legal/lawyers/?orderby=latestns&' + encodePage(10, 1) + '&functionType=lawyer&IsPartner=true&scope=brief').then(function (r) {
      return (r || []).map(normalizeLawyer);
    });
  },
  getTestimonials: function () {
    return get('api/legal/testimonials/tops/4').then(function (r) {
      return (r || []).map(normalizeTestimonial);
    });
  },
  getArticles: function (opts) {
    opts = opts || {};
    let q = 'api/crm/articles?' + encodePage(opts.max || 12, opts.start || 1) + '&orderby=latest';
    if (opts.search) q += '&search=' + encodeURIComponent(opts.search);
    if (opts.section) q += '&section=' + encodeURIComponent(opts.section);
    // Website SORT & FILTER: countries and regions / practice areas and industries.
    if (opts.countries && opts.countries.length) q += '&countries=' + encodeValueList(opts.countries);
    if (opts.categories && opts.categories.length) q += '&categories=' + encodeValueList(opts.categories);
    if (opts.highlighted) q += '&highlighted=true';
    return get(q).then(function (r) { return (r || []).map(normalizeArticle); });
  },
  // Option lists for the Articles page filter panel (website uses the lawyer
  // country codes plus the shared area codes, with "News" hidden).
  getArticleFilters: function () {
    return Promise.all([
      get('api/legal/lawyers/codes/country'),
      get('api/core/codes/areas')
    ]).then(function (responses) {
      return {
        countries: normalizeCodeList(responses[0]),
        areas: normalizeCodeList(responses[1]).filter(function (value) { return value !== 'News'; })
      };
    });
  },
  getAwards: function (opts) {
    opts = opts || {};
    let q = 'api/crm/awards?' + encodePage(opts.max || 12, opts.start || 1) + '&orderby=latest';
    if (opts.search) q += '&search=' + encodeURIComponent(opts.search);
    return get(q).then(function (r) { return (r || []).map(normalizeArticle); });
  },
  getHighlights: function () {
    return this.getArticles({ max: 12, highlighted: true });
  },
  getDeals: function (opts) {
    opts = opts || {};
    let q = 'api/legal/deals?' + encodePage(opts.max || 12, opts.start || 1) + '&orderby=latest';
    if (opts.search) q += '&search=' + encodeURIComponent(opts.search);
    return get(q).then(function (r) { return (r || []).map(normalizeDeal); });
  },
  getLawfirms: function (opts) {
    opts = opts || {};
    let q = 'api/legal/lawfirms/?' + encodePage(opts.max || 12, opts.start || 1);
    q += '&orderby=' + encodeURIComponent(opts.orderby || 'latest');
    if (opts.search) q += '&search=' + encodeURIComponent(opts.search);
    // Website SORT & FILTER: countries and regions / offices / practice areas.
    if (opts.countries && opts.countries.length) q += '&countries=' + encodeValueList(opts.countries);
    if (opts.office && opts.office.length) q += '&office=' + encodeValueList(opts.office);
    if (opts.categories && opts.categories.length) q += '&categories=' + encodeValueList(opts.categories);
    return get(q).then(function (r) { return (r || []).map(normalizeLawfirm); });
  },
  // Option lists for the Law Firms page filter panel. The website drops the
  // "Hong Kong" country entries and hides the "News" area.
  getLawfirmFilters: function () {
    return Promise.all([
      get('api/legal/lawyers/codes/country'),
      get('api/legal/lawyers/codes/city'),
      get('api/core/codes/areas')
    ]).then(function (responses) {
      return {
        countries: normalizeCodeList(responses[0]).filter(function (value) { return value.indexOf('Hong Kong') !== 0; }),
        cities: normalizeCodeList(responses[1]),
        areas: normalizeCodeList(responses[2]).filter(function (value) { return value !== 'News'; })
      };
    });
  },
  getLawyers: function (opts) {
    opts = opts || {};
    const pageParam = (opts.start > 1) ? encodePage(opts.max || 12, opts.start) : encodePageCapital(opts.max || 12, 1);
    let q = 'api/legal/lawyers/?' + pageParam + '&functionType=lawyer';
    if (opts.search) q += '&search=' + encodeURIComponent(opts.search);
    if (opts.admission) q += '&admission=' + encodeURIComponent(opts.admission);
    if (opts.position) q += '&position=' + encodeURIComponent(opts.position);
    if (opts.language) q += '&language=' + encodeURIComponent(opts.language);
    if (opts.areas) q += '&areas=' + encodeURIComponent(opts.areas);
    q += '&orderby=' + encodeURIComponent(opts.orderby || 'latest');
    return get(q).then(function (r) { return (r || []).map(normalizeLawyer); });
  },
  getLawyerFilters: function () {
    return Promise.all([
      get('api/legal/lawyers/codes/admission'),
      get('api/legal/lawyers/codes/position'),
      get('api/legal/lawyers/codes/language'),
      get('api/core/codes/areas')
    ]).then(function (responses) {
      return {
        admissions: normalizeCodeList(responses[0]),
        positions: normalizeCodeList(responses[1]),
        languages: normalizeCodeList(responses[2]),
        areas: normalizeCodeList(responses[3]).filter(function (value) { return value !== 'News'; })
      };
    });
  },

  // Phase 1 — details
  getDealDetail: function (id) {
    return get('api/legal/deals/' + encodeURIComponent(id)).then(function (r) {
      const d = Array.isArray(r) ? r[0] : r;
      if (!d) return null;
      const norm = normalizeDeal(d);
      delete norm.raw;
      norm.body = stripHtml(d.descript || d.descript2);
      norm.bodyHtml = richText.toRichHtml(d.descript || d.descript2);
      norm.refNo = d.refNo || '';
      const industries = (d.relatedIndustries || []).map(function (x) { return x && x.area; }).filter(Boolean);
      norm.category = industries[0] || '';
      norm.banner = imageUrl(d.dealBannerMobile || d.dealBanner);
      norm.completed = d.completedDateTime ? monthYear(d.completedDateTime) : '';
      norm.jurisdictions = d.relatedJurisdictions || [];
      norm.lawFirms = (d.lawFirms || []).map(function (f) { return { id: f.id, name: f.name }; }).filter(function (f) { return f.name; });
      return norm;
    });
  },
  getArticleDetail: function (id) {
    return get('api/crm/articles/' + encodeURIComponent(id)).then(function (a) {
      const o = Array.isArray(a) ? a[0] : a;
      if (!o) return null;
      const norm = normalizeArticle(o);
      // Detail content can contain large embedded images. Avoid duplicating the
      // original CMS payload in Page.data, which has a 1 MB setData limit.
      delete norm.raw;
      const articleContent = o.content || o.descript;
      norm.bodyHtml = richText.toRichHtml(articleContent);
      norm.body = norm.bodyHtml ? '' : stripHtml(articleContent);
      // Award write-ups carry their "LIST OF WINNERS" block in awardContent;
      // the website renders it below the article body.
      norm.award = awardContent.parseAwardContent(o.awardContent);
      return norm;
    });
  },
  getAnnouncementDetail: function (id) {
    return get('api/crm/announcements/' + encodeURIComponent(id)).then(function (r) {
      const n = Array.isArray(r) ? r[0] : r;
      if (!n) return null;
      const norm = normalizeAnnouncement(n);
      delete norm.raw;
      norm.descriptHtml = richText.toRichHtml(n.descript);
      return norm;
    });
  },
  getLawfirmDetail: function (id) {
    return get('api/legal/lawfirms/' + encodeURIComponent(id)).then(function (r) {
      const f = Array.isArray(r) ? r[0] : r;
      // A bare numeric id answers with a stub ({id, isLoaded:false}); the
      // profile id is the website slug, so treat a nameless row as "not found"
      // and let the caller fall back.
      if (!f || !f.name) return null;
      const norm = normalizeLawfirm(f);
      delete norm.raw;
      norm.nameLocal = decodeEntities(f.nameLocal);
      norm.overview = stripHtml(f.overview);
      norm.overviewHtml = richText.toRichHtml(f.overview);
      norm.numOfLawyer = Number(f.numOfLawyer) || 0;
      norm.numOfPartner = Number(f.numOfPartner) || 0;
      norm.numOfOffice = Number(f.numOfOffice) || 0;
      norm.numOfDeal = Number(f.numOfDeal) || 0;
      // LegalOne Merits counters (rank1 Distinguished / 2 Exemplary / 3 Remarkable).
      norm.distinguished = Number(f.rank1Total) || 0;
      norm.exemplary = Number(f.rank2Total) || 0;
      norm.remarkable = Number(f.rank3Total) || 0;
      const office = (f.lawFirmOffices && f.lawFirmOffices[0]) || {};
      norm.location = [office.city, office.country].filter(Boolean).map(decodeEntities).join(', ');
      norm.refNo = f.refNo || '';
      // Website prints the full "Last updated" date on the profile.
      norm.updated = f.moddttm ? fullDate(f.moddttm) : '';
      norm.established = decodeEntities(f.establishedIn);
      norm.website = decodeEntities(f.webSite);
      norm.industries = (f.industries || []).map(function (x) { return decodeEntities(x && x.area); }).filter(Boolean);
      // The website closes the profile with the client-supplied practice list.
      norm.industriesProvidedByClient = decodeEntities(f.industriesProvidedByClient);
      // Offices carry their own practice lists on the website (city + areas).
      norm.offices = (f.lawFirmOffices || []).map(function (o) {
        return {
          id: o.id || '',
          refNo: o.refNo || '',
          name: decodeEntities(o.name),
          city: decodeEntities(o.city) || decodeEntities(o.name),
          industries: (o.industries || []).map(function (x) { return decodeEntities(x && x.area); }).filter(Boolean)
        };
      });
      norm.honours = (f.lawyerHonoursList || []).map(function (h) {
        return {
          articleId: h.articleId || '',
          name: (h.lawyers || []).map(function (l) { return decodeEntities(l && l.name); }).filter(Boolean).join(', '),
          awardName: decodeEntities(h.awardName)
        };
      }).filter(function (h) { return h.articleId; });
      norm.contacts = (f.contacts || []).filter(function (c) { return c && c.published !== false; })
        .map(function (c) { return [c.type, c.detail].filter(Boolean).join(': '); }).filter(Boolean);
      return norm;
    });
  },
  getLawyerDetail: function (id) {
    return get('api/legal/lawyers/' + encodeURIComponent(id)).then(function (r) {
      const l = Array.isArray(r) ? r[0] : r;
      if (!l) return null;
      const norm = normalizeLawyer(l);
      delete norm.raw;
      norm.biography = stripHtml(l.biography);
      norm.biographyHtml = richText.toRichHtml(l.biography);
      norm.refNo = decodeEntities(l.refNo);
      norm.updated = l.moddttm ? fullDate(l.moddttm) : '';
      const verification = (l.verifications || []).find(function (v) {
        return v && (v.status || '').toUpperCase() === 'VERIFIED';
      });
      norm.verificationId = (verification && verification.id) || '';
      norm.awards = (l.awards || []).map(function (a) {
        return { title: decodeEntities(a.title), year: decodeEntities(a.year), org: decodeEntities(a.organization) };
      }).filter(function (a) { return a.title; });
      norm.careerPaths = (l.careerPaths || []).map(function (career) {
        return {
          title: decodeEntities(career.title),
          company: decodeEntities(career.company),
          start: decodeEntities(career.start),
          end: decodeEntities(career.end) || 'now',
          location: [career.city, career.country].filter(Boolean).map(decodeEntities).join(', ')
        };
      }).filter(function (career) { return career.title || career.company; });
      norm.legalOneAwards = (l.legalOneAwards || []).map(function (a) {
        return {
          id: a.id || a.articleId || '',
          articleId: a.articleId || '',
          name: decodeEntities(a.name),
          year: decodeEntities(a.year),
          image: imageUrl(a.imageIcon, 'm')
        };
      }).filter(function (a) { return a.name; });
      norm.practiceAreas = (l.industries || []).map(function (x) { return decodeEntities(x && x.area); }).filter(Boolean);
      norm.admissions = (l.admissions || []).map(function (a) {
        return { country: decodeEntities(a.country), year: decodeEntities(a.year), licenseNumber: decodeEntities(a.licenseNumber) };
      }).filter(function (a) { return a.country; });
      norm.languages = (l.languages || []).map(decodeEntities);
      norm.educations = (l.educations || []).map(function (e) {
        return { year: decodeEntities(e.year), qualification: decodeEntities(e.qualification), institution: decodeEntities(e.institution) };
      }).filter(function (e) { return e.qualification || e.institution; });
      norm.memberships = (l.professionalMemberships || []).map(function (m) {
        return { title: decodeEntities(m.title), organization: decodeEntities(m.organization) };
      }).filter(function (m) { return m.title || m.organization; });
      return norm;
    });
  },

  getSavedStatus: function (memberId, contentType, contentId) {
    return get('api/crm/member/' + encodeURIComponent(memberId) + '/saved-items/status?contentType=' +
      encodeURIComponent(contentType) + '&contentId=' + encodeURIComponent(contentId), { auth: true });
  },
  saveItem: function (memberId, contentType, contentId, url) {
    return post('api/crm/member/' + encodeURIComponent(memberId) + '/saved-items', {
      auth: true,
      data: { contentType: contentType, contentId: contentId, url: url }
    });
  },
  unsaveItem: function (memberId, savedItemId) {
    return remove('api/crm/member/' + encodeURIComponent(memberId) + '/saved-items/' +
      encodeURIComponent(savedItemId), { auth: true });
  },

  // Phase 1 — law firm sub-lists (Annex A §4.1)
  getLawfirmOffices: function (id) {
    return get('api/legal/lawfirms/' + encodeURIComponent(id) + '/offices').then(function (r) { return r || []; });
  },
  getLawfirmLawyers: function (id, opts) {
    return listSub('api/legal/lawfirms/' + encodeURIComponent(id) + '/lawyers/?functionType=lawyer', opts, normalizeLawyer);
  },
  getLawfirmPartners: function (id, opts) {
    return listSub('api/legal/lawfirms/' + encodeURIComponent(id) + '/partners/?functionType=lawyer', opts, normalizeLawyer);
  },
  getLawfirmCases: function (id, opts) {
    return embedSub('api/legal/lawfirms/' + encodeURIComponent(id) + '/cases', opts, normalizeDeal);
  },
  getLawfirmArticles: function (id, opts) {
    return embedSub('api/legal/lawfirms/' + encodeURIComponent(id) + '/articles', opts, normalizeArticle);
  },
  getLawfirmHonours: function (id, opts) {
    return embedSub('api/legal/lawfirms/' + encodeURIComponent(id) + '/honours', opts, normalizeHonour)
      .then(function (rows) {
        return rows.filter(function (row) { return row.articleId; });
      });
  },

  // Phase 1 — lawyer sub-lists (Annex A §4.3)
  getLawyerCases: function (id, opts) {
    return listSub('api/legal/lawyers/' + encodeURIComponent(id) + '/cases/', opts, normalizeDeal);
  },
  getLawyerArticles: function (id, opts) {
    return listSub('api/legal/lawyers/' + encodeURIComponent(id) + '/articles/', opts, normalizeArticle);
  },
  getLawyerTestimonials: function (id, opts) {
    return listSub('api/legal/lawyers/' + encodeURIComponent(id) + '/testimonials/', opts, normalizeTestimonial);
  },
  getLawyerAdvertisements: function () {
    return Promise.all([
      get('api/Advertisement?pageName=LawyerProfile&adType=MPU&adPosition=Top'),
      get('api/Advertisement?pageName=LawyerProfile&adType=MPU&adPosition=Down')
    ]).then(function (responses) {
      const top = Array.isArray(responses[0]) ? responses[0] : (responses[0] ? [responses[0]] : []);
      const down = Array.isArray(responses[1]) ? responses[1] : (responses[1] ? [responses[1]] : []);
      return {
        top: top.map(normalizeAdvertisement).filter(function (ad) { return ad.image; }),
        down: down.map(normalizeAdvertisement).filter(function (ad) { return ad.image; })
      };
    });
  },
  getLawfirmAdvertisements: function () {
    return Promise.all([
      get('api/Advertisement?pageName=LawfirmProfile&adType=MPU&adPosition=Top'),
      get('api/Advertisement?pageName=LawfirmProfile&adType=MPU&adPosition=Down')
    ]).then(function (responses) {
      const top = Array.isArray(responses[0]) ? responses[0] : (responses[0] ? [responses[0]] : []);
      const down = Array.isArray(responses[1]) ? responses[1] : (responses[1] ? [responses[1]] : []);
      return {
        top: top.map(normalizeAdvertisement).filter(function (ad) { return ad.image; }),
        down: down.map(normalizeAdvertisement).filter(function (ad) { return ad.image; })
      };
    });
  },

  // Phase 1 — detail sidebars (Annex A §4.4 / §4.5)
  getDealTopDeals: function (id) {
    return get('api/legal/deals/' + encodeURIComponent(id) + '/tops/5/deals').then(function (r) {
      return (r || []).map(normalizeDeal);
    });
  },
  getDealTopArticles: function (id) {
    return get('api/legal/deals/' + encodeURIComponent(id) + '/tops/5/articles').then(function (r) {
      return (r || []).map(normalizeArticle);
    });
  },
  getRelatedArticles: function (id) {
    return get('api/crm/articles/' + encodeURIComponent(id) + '/related').then(function (r) {
      return (r || []).map(normalizeArticle);
    });
  },
  getRelatedAwards: function (id) {
    return get('api/crm/awards/' + encodeURIComponent(id) + '/related').then(function (r) {
      return (r || []).map(normalizeArticle);
    });
  },
  getPromotedArticles: function (id) {
    return get('api/crm/articles/' + encodeURIComponent(id) + '/promoted').then(function (r) {
      return (r || []).map(normalizeArticle);
    });
  },
  getArticleLawyers: function (id) {
    return get('api/crm/articles/' + encodeURIComponent(id) + '/lawyers').then(function (r) {
      return (r || []).map(normalizeLawyer);
    });
  },

  // Phase 1 — code / lookup APIs (Annex A §6). All return { contents: [...] }.
  getCodes: function (path) {
    return get(path).then(function (r) {
      const list = (r && r.contents) || [];
      return list.map(function (x) { return x && x.code; }).filter(Boolean);
    });
  },
  getCodeCountries: function () { return this.getCodes('api/legal/lawyers/codes/country'); },
  getCodeAwardCountries: function () { return this.getCodes('api/legal/lawyers/codes/awardCountry'); },
  getCodeCities: function () { return this.getCodes('api/legal/lawyers/codes/city'); },
  getCodeAdmissions: function () { return this.getCodes('api/legal/lawyers/codes/admission'); },
  getCodePositions: function () { return this.getCodes('api/legal/lawyers/codes/position'); },
  getCodeLanguages: function () { return this.getCodes('api/legal/lawyers/codes/language'); },
  getCodeJurisdictions: function () { return this.getCodes('api/legal/lawyers/codes/jurisdiction'); },
  getCodeCallingCodes: function () {
    return get('api/legal/lawyers/codes/callingCode').then(function (r) { return (r && r.contents) || []; });
  },
  getCodeAreas: function () { return this.getCodes('api/core/codes/areas'); },
  getCitiesByCountry: function (country) {
    return get('api/core/codelinks/countryAndCity/' + encodeURIComponent(country)).then(function (r) {
      // The endpoint answers { contents: [{ code: "Beijing" }, ...] }.
      return ((r && r.contents) || []).map(function (x) { return x && (x.city || x.code); }).filter(Boolean);
    });
  },
  searchLawfirms: function (term) {
    return get('api/legal/lawfirms/?orderby=' + encodeURIComponent('name asc') + '&search=' + encodeURIComponent(term))
      .then(function (r) { return (r || []).map(normalizeLawfirm); });
  },

  // Phase 2 — login / member
  login: function (email, password) {
    return post('api/crm/member/login/', { data: { email: email, password: password } });
  },
  isValidToken: function (memberId) {
    return post('api/crm/member/isValidToken/', { data: JSON.stringify(memberId), auth: true });
  },
  logout: function (memberId) {
    return post('api/crm/member/logout/', { data: JSON.stringify(memberId), auth: true });
  },
  getMember: function (memberId) {
    return get('api/crm/member/' + encodeURIComponent(memberId), { auth: true });
  },

  // Phase 2 — registration (Annex B §3)
  checkAvailableAndOTP: function (email, captchaVerifyParam) {
    return post('api/crm/member/checkAvailableAndOTP/', {
      data: { captchaVerifyParam: captchaVerifyParam, email: email }
    });
  },
  // Body is the JSON-encoded email string; X-CAPTCHA-VERIFIED token comes from checkAvailableAndOTP.
  checkAndResendOTP: function (email, captchaToken) {
    return post('api/crm/member/checkAndResendOTP/', {
      data: JSON.stringify(email),
      headers: { 'X-CAPTCHA-VERIFIED': captchaToken || '' }
    });
  },
  validateOTP: function (email, code) {
    return post('api/crm/member/validateOTP/', { data: { code: code, email: email } });
  },
  createMember: function (payload, otpToken, otpCode) {
    return post('api/crm/member/create', {
      data: payload,
      headers: { 'X-OTP-TOKEN': otpToken || '', 'X-OTP': otpCode || '' }
    });
  },

  // Phase 2 — forget / reset password (Annex B §4)
  passwordRecoveryRequest: function (email, captchaVerifyParam) {
    return post('api/crm/member/passwordRecoveryRequest/', {
      data: { captchaVerifyParam: captchaVerifyParam, email: email }
    });
  },
  // Path spelling "Passowrd" matches production — do not "fix".
  checkPasswordRecoveryLink: function (email, token) {
    return post('api/crm/member/checkPassowrdRecoveryLink/', { data: { email: email, token: token } });
  },
  passwordRecovery: function (email, token, password) {
    return post('api/crm/member/passwordRecovery/', { data: { email: email, token: token, password: password } });
  },

  // Phase 2 — member profile (Annex B §5)
  updateMember: function (body) {
    return post('api/crm/member/update/', { data: body, auth: true });
  },
  sectorChanged: function (memberId) {
    return post('api/crm/member/sectorChanged/', { data: JSON.stringify(memberId), auth: true });
  },
  changePassword: function (memberId, originalPassword, newPassword) {
    return post('api/crm/member/changePassword/', {
      data: { id: memberId, originalPassword: originalPassword, newPassword: newPassword },
      auth: true
    });
  },
  // Field name is "opt" (not otp) per Annex B §5.5.
  updateAccessEmail: function (memberId, email, opt, isBusinessEmail) {
    return post('api/crm/member/updateAccessEmail/', {
      data: { id: memberId, email: email, opt: opt, isBusinessEmail: !!isBusinessEmail },
      auth: true
    });
  },

  // Phase 2 — dashboard lists (Annex B §7)
  getVerifications: function (memberId) {
    return get('api/crm/member/' + encodeURIComponent(memberId) + '/verifications', { auth: true })
      .then(function (r) { return r || []; });
  },
  getDealSubmissions: function (memberId) {
    return get('api/crm/member/submissionHistory/' + encodeURIComponent(memberId) + '/deal-submission', { auth: true })
      .then(function (r) { return r || []; });
  },
  getAwardSubmissions: function (memberId) {
    return get('api/crm/member/submissionHistory/' + encodeURIComponent(memberId) + '/award-submission', { auth: true })
      .then(function (r) { return r || []; });
  },

  // Phase 2 — forms & questionnaires (Annex B §9)
  getApplicationForms: function () {
    return get('api/crm/member/applicationForm', { auth: true }).then(function (r) { return r || []; });
  },
  getApplicationForm: function (formId) {
    return get('api/crm/member/applicationForm/' + encodeURIComponent(formId), { auth: true })
      .then(function (r) { return (r && r[0]) || null; });
  },
  createSubmission: function (body) {
    return post('api/crm/questionnaires/', { data: body, auth: true });
  },

  // Annex B §8 — status helpers exposed for the member UI
  submissionStatus: submissionStatus,
  verificationStatus: verificationStatus,
  showVerificationNumber: showVerificationNumber,
  formUrl: formUrl,
  // Phase 2 — member email/password rules (Annex B §3)
  passwordValid: function (pw) {
    return typeof pw === 'string' && pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw);
  }
};

module.exports = api;
