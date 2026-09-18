const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
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
// The website paginates filtered results twelve at a time.
const PER_PAGE = 12;

function withChecked(values, selected) {
  return values.map(function (value) {
    return { value: value, checked: selected.indexOf(value) >= 0 };
  });
}

Page({
  behaviors: [safeArea, breadcrumb],

  data: {
    sections: [],
    results: [],
    filtered: false,
    keyword: '',
    filtersOpen: false,
    sortFilterLabel: 'SORT & FILTER',
    activeFilterCount: 0,
    countriesLabel: 'Countries and regions',
    areasLabel: 'Practice areas and industries',
    countryOptions: [],
    areaOptions: [],
    countries: [],
    areas: [],
    openGroups: { countries: false, areas: false },
    heading: '',
    page: 1,
    hasMore: false,
    loading: false
  },

  onLoad() {
    this.fetchSections();
    this.loadFilters();
  },

  onReachBottom() {
    if (this.data.filtered && this.data.hasMore && !this.data.loading) this.fetchResults(false);
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

  loadFilters() {
    const self = this;
    api.getArticleFilters().then(function (filters) {
      self.setData({
        countryOptions: withChecked((filters && filters.countries) || [], self.data.countries),
        areaOptions: withChecked((filters && filters.areas) || [], self.data.areas)
      });
    }).catch(function () {});
  },

  toggleFilters() {
    this.setData({ filtersOpen: !this.data.filtersOpen });
  },

  toggleGroup(e) {
    const group = e.currentTarget.dataset.group;
    const openGroups = Object.assign({}, this.data.openGroups);
    openGroups[group] = !openGroups[group];
    this.setData({ openGroups: openGroups });
  },

  countFilters(countries, areas, keyword) {
    let count = countries.length + areas.length;
    if (String(keyword || '').trim()) count += 1;
    return count;
  },

  onCountriesChange(e) {
    const countries = e.detail.value || [];
    this.setData({
      countries: countries,
      countryOptions: withChecked(this.data.countryOptions.map(function (o) { return o.value; }), countries),
      activeFilterCount: this.countFilters(countries, this.data.areas, this.data.keyword)
    });
  },

  onAreasChange(e) {
    const areas = e.detail.value || [];
    this.setData({
      areas: areas,
      areaOptions: withChecked(this.data.areaOptions.map(function (o) { return o.value; }), areas),
      activeFilterCount: this.countFilters(this.data.countries, areas, this.data.keyword)
    });
  },

  onInput(e) {
    this.setData({
      keyword: e.detail.value,
      activeFilterCount: this.countFilters(this.data.countries, this.data.areas, e.detail.value)
    });
  },

  onApply() {
    this.setData({ filtersOpen: false });
    this.fetchResults(true);
  },

  onReset() {
    this.setData({
      countries: [],
      areas: [],
      keyword: '',
      activeFilterCount: 0,
      countryOptions: withChecked(this.data.countryOptions.map(function (o) { return o.value; }), []),
      areaOptions: withChecked(this.data.areaOptions.map(function (o) { return o.value; }), []),
      openGroups: { countries: false, areas: false },
      results: [],
      filtered: false,
      heading: '',
      page: 1,
      hasMore: false
    });
  },

  // Mirrors the website: applying the panel replaces the sectioned layout with
  // one filtered list ("Latest Articles" is only titled when searching).
  fetchResults(reset) {
    const self = this;
    const keyword = this.data.keyword.trim();
    const countries = this.data.countries;
    const areas = this.data.areas;
    const start = reset ? 1 : this.data.page + 1;
    this.setData({ loading: true, filtered: true, heading: keyword ? 'Latest Articles' : '' });
    api.getArticles({ max: PER_PAGE, start: start, search: keyword, countries: countries, categories: areas })
      .then(function (items) {
        const results = reset ? items : self.data.results.concat(items);
        self.setData({
          results: results,
          page: start,
          hasMore: items.length >= PER_PAGE,
          loading: false
        });
      })
      .catch(function () {
        const lower = keyword.toLowerCase();
        const pool = fb.latest.concat(fb.highlights, fb.awards);
        const items = reset ? pool.filter(function (it) {
          const haystack = (it.title + ' ' + (it.labels || []).join(' ') + ' ' + (it.author || '')).toLowerCase();
          return !lower || haystack.indexOf(lower) >= 0;
        }) : [];
        self.setData({ results: items, page: 1, hasMore: false, loading: false });
      });
  },

  goDetail(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '')
    });
  }
});
