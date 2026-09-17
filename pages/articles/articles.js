const safeArea = require('../../services/safe-area.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

// The website's /article_list is grouped into named sections, four entries each
// (it requests api/crm/articles with the same section names). "Interview" is served
// by the Leadership Talk section on the site.
const SECTIONS = [
  { title: 'Latest Articles' },
  { title: 'Fireside Chat', section: 'Fireside Chat' },
  { title: 'Expert Insights', section: 'Expert Insights' },
  { title: 'Intelligence', section: 'Intelligence' },
  { title: 'Interview', section: 'Leadership Talk' },
  { title: 'Special Feature', section: 'Special Feature' },
  { title: 'News', section: 'News' }
];
const PER_SECTION = 4;

Page({
  behaviors: [safeArea],

  data: {
    sections: [],
    results: [],
    keyword: '',
    searching: false,
    loading: false
  },

  onLoad() {
    this.fetchSections();
  },

  fetchSections() {
    const self = this;
    this.setData({ loading: true });
    Promise.all(SECTIONS.map(function (s) {
      return api.getArticles({ max: PER_SECTION, start: 1, section: s.section }).catch(function () { return []; });
    })).then(function (lists) {
      const sections = lists.map(function (items, i) {
        return { title: SECTIONS[i].title, items: items };
      }).filter(function (s) { return s.items.length; });
      if (!sections.length) {
        sections.push({ title: 'Latest Articles', items: fb.latest.slice(0, PER_SECTION) });
      }
      self.setData({ sections: sections, loading: false });
    });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    const kw = (this.data.keyword || '').trim();
    if (!kw) {
      this.setData({ searching: false, results: [] });
      return;
    }
    const self = this;
    this.setData({ loading: true, searching: true });
    api.getArticles({ max: 20, start: 1, search: kw }).then(function (items) {
      self.setData({ results: items, loading: false });
    }).catch(function () {
      const lower = kw.toLowerCase();
      const items = fb.latest.filter(function (it) {
        return (it.title + ' ' + (it.labels || []).join(' ') + ' ' + it.author).toLowerCase().indexOf(lower) >= 0;
      });
      self.setData({ results: items, loading: false });
    });
  },

  goDetail(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '')
    });
  }
});
