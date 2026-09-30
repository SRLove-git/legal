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
        return {
          title: SECTIONS[i].title,
          section: SECTIONS[i].section || '',
          items: items,
          page: 1,
          hasMore: items.length >= PER_SECTION,
          loading: false
        };
      }).filter(function (s) { return s.items.length; });
      if (!sections.length) {
        sections.push({
          title: 'Latest Articles',
          section: '',
          items: fb.latest.slice(0, PER_SECTION),
          page: 1,
          hasMore: false,
          loading: false
        });
      }
      self.setData({ sections: sections, loading: false });
    });
  },

  learnMore(e) {
    const index = Number(e.currentTarget.dataset.index);
    const section = this.data.sections[index];
    if (!section || section.loading || !section.hasMore) return;

    const nextPage = section.page + 1;
    const loadingKey = 'sections[' + index + '].loading';
    this.setData({ [loadingKey]: true });
    const self = this;
    api.getArticles({ max: PER_SECTION, start: nextPage, section: section.section })
      .then(function (items) {
        const itemsKey = 'sections[' + index + '].items';
        const pageKey = 'sections[' + index + '].page';
        const moreKey = 'sections[' + index + '].hasMore';
        const patch = {};
        patch[itemsKey] = section.items.concat(items);
        patch[pageKey] = nextPage;
        patch[moreKey] = items.length >= PER_SECTION;
        patch[loadingKey] = false;
        self.setData(patch);
      })
      .catch(function () {
        self.setData({ [loadingKey]: false });
        wx.showToast({ title: 'Could not load more articles', icon: 'none' });
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
    const filtersOpen = !this.data.filtersOpen;
    this.setData({
      filtersOpen: filtersOpen,
      openGroups: filtersOpen ? this.data.openGroups : { countries: false, areas: false }
    });
  },

  toggleGroup(e) {
    const group = e.currentTarget.dataset.group;
    const openGroups = Object.assign({}, this.data.openGroups);
    const willOpen = !openGroups[group];
    Object.keys(openGroups).forEach(function (key) { openGroups[key] = false; });
    openGroups[group] = willOpen;
    this.setData({ openGroups: openGroups });
  },

  countFilters(countries, areas, keyword) {
    let count = countries.length + areas.length;
    if (String(keyword || '').trim()) count += 1;
    return count;
  },

  toggleCountryOption(e) {
    const value = e.currentTarget.dataset.value;
    const countries = this.data.countries.slice();
    const index = countries.indexOf(value);
    if (index >= 0) countries.splice(index, 1);
    else countries.push(value);
    this.setData({
      countries: countries,
      countryOptions: withChecked(this.data.countryOptions.map(function (o) { return o.value; }), countries),
      activeFilterCount: this.countFilters(countries, this.data.areas, this.data.keyword)
    });
  },

  toggleAreaOption(e) {
    const value = e.currentTarget.dataset.value;
    const areas = this.data.areas.slice();
    const index = areas.indexOf(value);
    if (index >= 0) areas.splice(index, 1);
    else areas.push(value);
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

  loadMoreResults() {
    if (this.data.loading || !this.data.hasMore) return;
    this.fetchResults(false);
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
