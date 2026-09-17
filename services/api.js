// LegalOne Global — mini program API service.
// Reference: Technical Annex A (Phase 1 public browse) + Annex B (Phase 2 login).
const config = require('../config.js');
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

function encodePage(max, start) {
  return 'page=' + encodeURIComponent('{max:' + max + ',start:' + start + '}');
}

function encodePageCapital(max, start) {
  return 'Page=' + encodeURIComponent('{Max:' + max + ',Start:' + start + '}');
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

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '-')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

const RANK_LABELS = { 3: 'Remarkable', 2: 'Highly Recommended', 1: 'Recommended' };

function rankLabel(rank) {
  return RANK_LABELS[rank] || ('Rank ' + rank);
}

function normalizeDeal(d) {
  return {
    id: d.id,
    title: d.headline || '',
    rank: rankLabel(d.rank),
    date: 'Date of completion: ' + monthYear(d.completedDateTime),
    raw: d
  };
}

function normalizeLawfirm(f) {
  return {
    id: f.id,
    name: f.name || '',
    image: imageUrl(f.profileIcon, 'm'),
    raw: f
  };
}

function normalizeLawyer(l) {
  const office = (l.lawFirm && l.lawFirm.lawFirmOffices && l.lawFirm.lawFirmOffices[0]) || {};
  const location = [office.city, office.country].filter(Boolean).join(', ');
  return {
    id: l.id,
    name: [l.firstName, l.name].filter(Boolean).join(' '),
    image: imageUrl(l.profileIcon, 'm'),
    positions: [l.primaryTitle, l.secondaryTitle].filter(Boolean),
    firm: (l.lawFirm && l.lawFirm.name) || '',
    location: location,
    raw: l
  };
}

function normalizeTestimonial(t) {
  const author = [t.clientName, t.clientTitle].filter(Boolean).join(', ');
  return {
    id: t.id,
    name: t.lawyerName || '',
    comment: t.comment || '',
    author: author,
    company: t.clientCompanyName || '',
    raw: t
  };
}

function normalizeArticle(a) {
  const authors = (a.authors || []).map(function (x) {
    return [x.firstName, x.name].filter(Boolean).join(' ').trim();
  }).filter(Boolean);
  return {
    id: a.id,
    title: a.headline || '',
    image: imageUrl(a.image, 'l'),
    labels: (a.categories || []).map(function (c) { return c.id || c; }),
    author: authors.join(', '),
    date: a.publishDate ? dateOnly(a.publishDate) : '',
    raw: a
  };
}

function normalizeAnnouncement(n) {
  return {
    id: n.id,
    type: n.title || (n.type === 0 ? 'Deal Announcement' : 'Announcement'),
    headline: n.headline || '',
    image: imageUrl(n.image, 'x'),
    url: n.url || '',
    date: n.publishDate ? dateOnly(n.publishDate) : '',
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
    if (opts.highlighted) q += '&highlighted=true';
    return get(q).then(function (r) { return (r || []).map(normalizeArticle); });
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
    let q = 'api/legal/lawfirms/?' + encodePage(opts.max || 12, opts.start || 1) + '&orderby=latest';
    if (opts.search) q += '&search=' + encodeURIComponent(opts.search);
    return get(q).then(function (r) { return (r || []).map(normalizeLawfirm); });
  },
  getLawyers: function (opts) {
    opts = opts || {};
    const pageParam = (opts.start > 1) ? encodePage(opts.max || 12, opts.start) : encodePageCapital(opts.max || 12, 1);
    let q = 'api/legal/lawyers/?' + pageParam + '&functionType=lawyer&orderby=latest';
    if (opts.search) q += '&search=' + encodeURIComponent(opts.search);
    return get(q).then(function (r) { return (r || []).map(normalizeLawyer); });
  },

  // Phase 1 — details
  getDealDetail: function (id) {
    return get('api/legal/deals/' + encodeURIComponent(id)).then(function (r) {
      const d = Array.isArray(r) ? r[0] : r;
      if (!d) return null;
      const norm = normalizeDeal(d);
      norm.body = stripHtml(d.descript || d.descript2);
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
      norm.body = stripHtml(o.content || o.descript);
      return norm;
    });
  },
  getAnnouncementDetail: function (id) {
    return get('api/crm/announcements/' + encodeURIComponent(id)).then(function (r) {
      const n = Array.isArray(r) ? r[0] : r;
      return n ? normalizeAnnouncement(n) : null;
    });
  },
  getLawfirmDetail: function (id) {
    return get('api/legal/lawfirms/' + encodeURIComponent(id)).then(function (r) {
      const f = Array.isArray(r) ? r[0] : r;
      if (!f) return null;
      const norm = normalizeLawfirm(f);
      norm.overview = stripHtml(f.overview);
      norm.numOfLawyer = f.numOfLawyer;
      norm.numOfPartner = f.numOfPartner;
      norm.numOfOffice = f.numOfOffice;
      const office = (f.lawFirmOffices && f.lawFirmOffices[0]) || {};
      norm.location = [office.city, office.country].filter(Boolean).join(', ');
      norm.refNo = f.refNo || '';
      norm.updated = f.moddttm ? monthYear(f.moddttm) : '';
      norm.established = f.establishedIn || '';
      norm.website = f.webSite || '';
      norm.offices = (f.lawFirmOffices || []).map(function (o) { return o.name; }).filter(Boolean);
      norm.industries = (f.industries || []).map(function (x) { return x && x.area; }).filter(Boolean);
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
      norm.biography = stripHtml(l.biography);
      norm.contacts = l.contacts || [];
      norm.refNo = l.refNo || '';
      norm.updated = l.moddttm ? monthYear(l.moddttm) : '';
      norm.awards = (l.awards || []).map(function (a) {
        return { title: a.title, year: a.year, org: a.organization };
      }).filter(function (a) { return a.title; });
      norm.legalOneAwards = (l.legalOneAwards || []).map(function (a) { return a.name; }).filter(Boolean);
      norm.practiceAreas = (l.industries || []).map(function (x) { return x && x.area; }).filter(Boolean);
      norm.admissions = (l.admissions || []).map(function (a) {
        return [a.year, a.country].filter(Boolean).join(' · ');
      }).filter(Boolean);
      norm.languages = l.languages || [];
      norm.educations = (l.educations || []).map(function (e) {
        return [e.year, e.qualification, e.institution].filter(Boolean).join(' · ');
      }).filter(Boolean);
      norm.memberships = (l.professionalMemberships || []).map(function (m) { return m.title; }).filter(Boolean);
      return norm;
    });
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
    return listSub('api/legal/lawfirms/' + encodeURIComponent(id) + '/cases/', opts, normalizeDeal);
  },
  getLawfirmHonours: function (id, opts) {
    return listSub('api/legal/lawfirms/' + encodeURIComponent(id) + '/honours/?orderby=latest', opts, normalizeArticle);
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
      return ((r && r.contents) || []).map(function (x) { return x && x.city; }).filter(Boolean);
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
