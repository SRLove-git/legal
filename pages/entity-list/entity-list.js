const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');

// The website paginates every firm / office / lawyer list twelve rows at a time.
const PER_PAGE = 12;
const SITE = 'https://www.legaloneglobal.com';
const RANK_SMALL_ICONS = {
  1: SITE + '/images/LegalOne_Merits_Distinguished_Icon_Small.png',
  2: SITE + '/images/LegalOne_Merits_Exemplary_Icon_Small.png',
  3: SITE + '/images/LegalOne_Merits_Remarkable_Icon_Small.png'
};

// One entry per "More" button on a profile page. `kind` says how the endpoint
// pages ("list" = page/start query, "embed" = size in the path, "offices" = the
// whole office list that ships with the firm profile) and `row` picks the row
// markup. Every list the website opens from a "More" link is here, so the mini
// program can show it with its own header instead of handing over to the website.
const TYPES = {
  'lawfirm-cases': {
    group: 'lawfirm', title: 'Latest deals/cases of ', row: 'deal', kind: 'embed', crumb: 'Deals/Cases',
    load: function (ctx, opts) { return api.getLawfirmCases(ctx.id, opts); }
  },
  'lawfirm-articles': {
    group: 'lawfirm', title: 'Latest articles of ', row: 'article', kind: 'embed', crumb: 'Latest Articles',
    load: function (ctx, opts) { return api.getLawfirmArticles(ctx.id, opts); }
  },
  'lawfirm-honours': {
    group: 'lawfirm', title: "Lawyers' honours list of ", row: 'honour', kind: 'list', crumb: "Lawyers' Honours List",
    load: function (ctx, opts) { return api.getLawfirmHonoursList(ctx.id, opts); }
  },
  'lawfirm-offices': {
    group: 'lawfirm', title: 'Offices of ', row: 'office', kind: 'offices', crumb: 'Offices'
  },
  'lawfirm-lawyers': {
    group: 'lawfirm', title: 'Lawyers of ', row: 'lawyer', kind: 'list', crumb: 'Lawyers',
    load: function (ctx, opts) { return api.getLawfirmLawyers(ctx.id, opts); }
  },
  'lawfirm-partners': {
    group: 'lawfirm', title: 'Partners of ', row: 'lawyer', kind: 'list', crumb: 'Partners',
    load: function (ctx, opts) { return api.getLawfirmPartners(ctx.id, opts); }
  },
  'office-cases': {
    group: 'office', title: 'Latest deals/cases of ', row: 'deal', kind: 'embed', crumb: 'Deals/Cases',
    load: function (ctx, opts) { return api.getOfficeCases(ctx.id, opts); }
  },
  'office-articles': {
    group: 'office', title: 'Latest articles of ', row: 'article', kind: 'embed', crumb: 'Latest Articles',
    load: function (ctx, opts) { return api.getOfficeArticles(ctx.id, opts); }
  },
  'office-lawyers': {
    group: 'office', title: 'Lawyers of ', row: 'lawyer', kind: 'list', crumb: 'Lawyers',
    load: function (ctx, opts) { return api.getOfficeLawyers(ctx.parentId, ctx.id, opts); }
  },
  'office-partners': {
    group: 'office', title: 'Partners of ', row: 'lawyer', kind: 'list', crumb: 'Partners',
    load: function (ctx, opts) { return api.getOfficePartners(ctx.parentId, ctx.id, opts); }
  },
  'lawyer-cases': {
    group: 'lawyer', title: 'Latest deals/cases of ', row: 'deal', kind: 'list', crumb: 'Deals/Cases',
    load: function (ctx, opts) { return api.getLawyerCases(ctx.id, opts); }
  },
  'lawyer-articles': {
    group: 'lawyer', title: 'Latest articles of ', row: 'article', kind: 'list', crumb: 'Latest Articles',
    load: function (ctx, opts) { return api.getLawyerArticles(ctx.id, opts); }
  },
  'lawyer-testimonials': {
    group: 'lawyer', title: 'Client testimonials of ', row: 'testimonial', kind: 'list', crumb: 'Client testimonials',
    load: function (ctx, opts) { return api.getLawyerTestimonials(ctx.id, opts); }
  }
};

const CRUMBS = {
  lawfirm: { label: 'Law Firms', url: '/pages/lawfirms/lawfirms' },
  office: { label: 'Law Firms', url: '/pages/lawfirms/lawfirms' },
  lawyer: { label: 'Lawyers', url: '/pages/lawyers/lawyers' }
};

Page({
  behaviors: [safeArea, breadcrumb],
  data: {
    type: '',
    rowKind: '',
    title: '',
    subtitle: '',
    parentLabel: '',
    parentUrl: '',
    crumbLabel: 'Law Firms',
    crumbUrl: '/pages/lawfirms/lawfirms',
    backUrl: '',
    rows: [],
    page: 1,
    hasMore: false,
    loading: true,
    hyphenIcon: SITE + '/images/hyphen.JPG',
    // Offices without a logo show the website's watermark, as the site does.
    watermarkIcon: SITE + '/images/Logo-watermark.s.png'
  },
  onLoad(options) {
    const type = decodeURIComponent(options.type || '');
    const config = TYPES[type];
    const ctx = {
      id: decodeURIComponent(options.id || ''),
      parentId: decodeURIComponent(options.parentId || '')
    };
    const name = decodeURIComponent(options.name || '');
    const parentName = decodeURIComponent(options.parentName || '');
    if (!config || !ctx.id) {
      this.setData({ loading: false });
      return;
    }
    this.config = config;
    this.ctx = ctx;
    const crumb = CRUMBS[config.group] || CRUMBS.lawfirm;
    // The website heads every one of these pages "<section> of <profile>", e.g.
    // "Offices of Jia Yuan Law Offices".
    const title = config.title + name;
    const parentUrl = config.group === 'office' && ctx.parentId
      ? '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(ctx.parentId) + '&name=' + encodeURIComponent(parentName)
      : '';
    this.setData({
      type: type,
      rowKind: config.row,
      title: name ? title : config.title.replace(/ of $/, ''),
      subtitle: name,
      parentLabel: parentName,
      parentUrl: parentUrl,
      crumbLabel: crumb.label,
      crumbUrl: crumb.url,
      backUrl: this.profileUrl(config.group, ctx, name)
    });
    this.fetchPage(1);
  },
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.fetchPage(this.data.page + 1);
  },
  // The crumb walks back to the profile the reader came from.
  profileUrl(group, ctx, name) {
    const label = encodeURIComponent(name || '');
    if (group === 'office') {
      return '/pages/lawfirm-office/lawfirm-office?firmId=' + encodeURIComponent(ctx.parentId) +
        '&officeId=' + encodeURIComponent(ctx.id) + '&name=' + label;
    }
    if (group === 'lawyer') {
      return '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(ctx.id) + '&name=' + label;
    }
    return '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(ctx.id) + '&name=' + label;
  },
  fetchPage(page) {
    const self = this;
    const config = this.config;
    const ctx = this.ctx;
    if (!config || !ctx) return;
    this.setData({ loading: true });
    let request;
    if (config.kind === 'offices') {
      // The website's office list is the firm's office payload sorted by name,
      // with the office merits table on every card.
      request = api.getLawfirmDetail(ctx.id).then(function (item) {
        return ((item && item.offices) || []).slice().sort(function (a, b) {
          return String(a.name || '').localeCompare(String(b.name || ''));
        });
      });
    } else if (config.kind === 'list') {
      request = config.load(ctx, { max: PER_PAGE, start: (page - 1) * PER_PAGE + 1 });
    } else {
      // Embed endpoints always answer from the first row, so a later page asks
      // for a bigger slice and keeps only what has not been shown yet.
      request = config.load(ctx, { max: page * PER_PAGE }).then(function (rows) {
        return (rows || []).slice((page - 1) * PER_PAGE);
      });
    }
    request.then(function (rows) {
      const list = (rows || []).map(function (row) { return self.decorate(row); });
      const base = page > 1 ? self.data.rows : [];
      const known = {};
      base.forEach(function (row) { if (row.id) known[row.id] = true; });
      // Some of the site's endpoints ignore the page window and answer with the
      // same rows again; dropping repeats keeps "load more" from looping.
      const fresh = list.filter(function (row) { return !row.id || !known[row.id]; });
      self.setData({
        rows: base.concat(fresh),
        page: page,
        hasMore: config.kind === 'offices' ? false : fresh.length >= PER_PAGE,
        loading: false
      });
    }).catch(function () {
      self.setData({ loading: false, hasMore: false });
    });
  },
  decorate(row) {
    const kind = this.config.row;
    if (kind === 'deal') return Object.assign({}, row, { rankIcon: RANK_SMALL_ICONS[row.rankNo] || '' });
    return row;
  },
  goOffice(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const office = this.data.rows.find(function (row) { return row.id === id; }) || {};
    const firmId = this.ctx.parentId || this.ctx.id;
    wx.navigateTo({
      url: '/pages/lawfirm-office/lawfirm-office?firmId=' + encodeURIComponent(firmId) +
        '&officeId=' + encodeURIComponent(id) +
        '&name=' + encodeURIComponent(office.name || office.city || '') +
        '&firmName=' + encodeURIComponent(this.config.group === 'lawfirm' ? this.data.subtitle : '')
    });
  },
  goRow(e) {
    const d = e.currentTarget.dataset;
    if (!d.id) return;
    if (d.kind === 'deal') {
      wx.navigateTo({ url: '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(d.id) + '&title=' + encodeURIComponent(d.title || '') });
    } else if (d.kind === 'article') {
      wx.navigateTo({ url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id) + '&title=' + encodeURIComponent(d.title || '') });
    } else if (d.kind === 'lawyer') {
      wx.navigateTo({ url: '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(d.id) + '&name=' + encodeURIComponent(d.title || '') });
    }
  },
  onShareAppMessage() {
    return {
      title: (this.data.title || 'LegalOne') + (this.data.subtitle ? ' - ' + this.data.subtitle : ''),
      path: '/pages/entity-list/entity-list?type=' + encodeURIComponent(this.data.type || '') +
        '&id=' + encodeURIComponent((this.ctx && this.ctx.id) || '') +
        '&parentId=' + encodeURIComponent((this.ctx && this.ctx.parentId) || '') +
        '&name=' + encodeURIComponent(this.data.subtitle || '')
    };
  }
});
