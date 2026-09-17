// LegalOne Global — mini program API service.
// Reference: Technical Annex A (Phase 1 public browse) + Annex B (Phase 2 login).
const BASE = 'https://www.legaloneglobal.com/';
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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && (res.data.description || res.data.message)) || ('HTTP ' + res.statusCode);
          reject(new Error(msg));
        }
      },
      fail: reject
    });
  });
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
      return norm;
    });
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
  }
};

module.exports = api;
