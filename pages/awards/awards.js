const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

// The website paginates the awards list twelve at a time.
const PER_PAGE = 12;

function withChecked(values, selected) {
  return values.map(function (value) {
    return { value: value, checked: selected.indexOf(value) >= 0 };
  });
}

Page({
  behaviors: [safeArea, breadcrumb],

  data: {
    items: [],
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
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.loadFilters();
    this.fetch(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.fetch(false);
  },

  loadFilters() {
    const self = this;
    api.getAwardFilters().then(function (filters) {
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
    this.fetch(true);
  },

  onSearch() {
    this.onApply();
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
      filtersOpen: false
    });
    this.fetch(true);
  },

  buildOptions(page) {
    const options = { max: PER_PAGE, start: (page - 1) * PER_PAGE + 1 };
    const keyword = (this.data.keyword || '').trim();
    if (keyword) options.search = keyword;
    if (this.data.countries.length) options.countries = this.data.countries;
    if (this.data.areas.length) options.categories = this.data.areas;
    return options;
  },

  fetch(reset) {
    const self = this;
    const page = reset ? 1 : this.data.page + 1;
    this.setData({ loading: true });
    return api.getAwards(this.buildOptions(page)).then(function (items) {
      const rows = reset ? items : self.data.items.concat(items);
      self.setData({
        items: rows,
        page: page,
        hasMore: items.length >= PER_PAGE,
        loading: false
      });
    }).catch(function () {
      const keyword = (self.data.keyword || '').trim().toLowerCase();
      if (!reset) {
        self.setData({ loading: false, hasMore: false });
        return;
      }
      const rows = fb.awards.filter(function (it) {
        const haystack = (it.title + ' ' + (it.labels || []).join(' ') + ' ' + (it.author || '')).toLowerCase();
        return !keyword || haystack.indexOf(keyword) >= 0;
      });
      self.setData({ items: rows, page: 1, hasMore: false, loading: false });
    });
  },

  goDetail(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/article-detail/article-detail?id=' + encodeURIComponent(d.id || '') + '&title=' + encodeURIComponent(d.title || '')
    });
  },

  // Website hero button: signed-in members go to the form download page,
  // everyone else is sent to sign in.
  applyAward() {
    const token = wx.getStorageSync('X-ACCESS-TOKEN');
    const memberId = wx.getStorageSync('memberId');
    if (token && memberId) {
      wx.navigateTo({ url: '/pages/form-download/form-download' });
      return;
    }
    wx.navigateTo({ url: '/pages/login/login' });
  }
});
