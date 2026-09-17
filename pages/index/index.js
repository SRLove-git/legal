const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

function use(promise, fallback) {
  return promise
    .then(function (r) { return (r && r.length) ? r : fallback; })
    .catch(function () { return fallback; });
}

Page({
  data: {
    announcements: [],
    deals: [],
    latestLawfirms: [],
    latestPartners: [],
    testimonials: [],
    latest: [],
    awards: [],
    highlights: [],
    lawyers: [],
    lawfirms: []
  },

  onLoad() {
    this.loadAll();
  },

  loadAll() {
    const self = this;
    const set = function (key, val) { self.setData({ [key]: val }); };

    use(api.getAnnouncements(), fb.announcements).then(function (v) { set('announcements', v.slice(0, 5)); });
    use(api.getHomeDeals(), fb.deals).then(function (v) { set('deals', v.slice(0, 6)); });
    use(api.getHomeLawfirms(), fb.latestLawfirms).then(function (v) { set('latestLawfirms', v.slice(0, 10)); });
    use(api.getHomePartners(), fb.latestPartners).then(function (v) { set('latestPartners', v.slice(0, 10)); });
    use(api.getTestimonials(), fb.testimonials).then(function (v) { set('testimonials', v.slice(0, 4)); });
    use(api.getArticles({ max: 8 }), fb.latest).then(function (v) { set('latest', v.slice(0, 8)); });
    use(api.getAwards({ max: 4 }), fb.awards).then(function (v) { set('awards', v.slice(0, 4)); });
    use(api.getHighlights(), fb.highlights).then(function (v) { set('highlights', v.slice(0, 4)); });
    use(api.getLawyers({ max: 12 }), fb.lawyers).then(function (v) { set('lawyers', v.slice(0, 12)); });
    use(api.getLawfirms({ max: 12 }), fb.lawfirms).then(function (v) { set('lawfirms', v.slice(0, 12)); });
  },

  goAnnouncement(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: '/pages/announcement-detail/announcement-detail?id=' + encodeURIComponent(id) });
  },

  goDealDetail(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  },

  goArticleDetail(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '') });
  },

  goLawyerDetail(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(d.id || '') + '&name=' + encodeURIComponent(d.name || '') });
  },

  goLawfirmDetail(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(d.id || '') + '&name=' + encodeURIComponent(d.name || '') });
  },

  goDeals() { wx.navigateTo({ url: '/pages/deals/deals' }); },
  goArticles() { wx.navigateTo({ url: '/pages/articles/articles' }); },
  goAwards() { wx.navigateTo({ url: '/pages/awards/awards' }); },
  goHighlights() { wx.navigateTo({ url: '/pages/highlights/highlights' }); },
  goLawyers() { wx.navigateTo({ url: '/pages/lawyers/lawyers' }); },
  goLawfirms() { wx.navigateTo({ url: '/pages/lawfirms/lawfirms' }); }
});
