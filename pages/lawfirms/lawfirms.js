const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

// The website paginates the directory twelve firms at a time.
const PER_PAGE = 12;
// Website sort dropdown (lawfirm_list): value / label.
const SORT_OPTIONS = ['Sort', 'Recorded lawyers \u25bc', 'Recorded lawyers \u25b2', 'Name \u25bc', 'Name \u25b2'];
const SORT_VALUES = ['', 'numOfLawyer desc', 'numOfLawyer asc', 'name desc', 'name asc'];

function fallbackRows(keyword) {
  const term = String(keyword || '').trim().toLowerCase();
  return fb.lawfirms.filter(function (item) {
    return !term || item.name.toLowerCase().indexOf(term) >= 0;
  });
}

function withChecked(values, selected) {
  return values.map(function (value) {
    return { value: value, checked: selected.indexOf(value) >= 0 };
  });
}

// The website shortens long "Offices in ..." labels to 30 characters.
function officesLabel(country) {
  if (!country) return 'Offices';
  const label = 'Offices in ' + country;
  return label.length > 30 ? label.substr(0, 30) + '...' : label;
}

Page({
  behaviors: [safeArea, breadcrumb],

  data: {
    items: [],
    keyword: '',
    filtersOpen: false,
    sortFilterLabel: 'SORT & FILTER',
    activeFilterCount: 0,
    countryOptions: ['Countries and regions'],
    countryIndex: 0,
    officesLabel: 'Offices',
    areasLabel: 'Practice areas and industries',
    officeOptions: [],
    areaOptions: [],
    offices: [],
    areas: [],
    openGroups: { offices: false, areas: false },
    sortOptions: SORT_OPTIONS,
    sortIndex: 0,
    allCities: [],
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
    api.getLawfirmFilters().then(function (filters) {
      const cities = (filters && filters.cities) || [];
      self.setData({
        countryOptions: ['Countries and regions'].concat((filters && filters.countries) || []),
        officeOptions: withChecked(cities, self.data.offices),
        areaOptions: withChecked((filters && filters.areas) || [], self.data.areas),
        allCities: cities
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

  countFilters(countryIndex, offices, areas, keyword, sortIndex) {
    let count = offices.length + areas.length;
    if (countryIndex) count += 1;
    if (sortIndex) count += 1;
    if (String(keyword || '').trim()) count += 1;
    return count;
  },

  // Picking a country reloads the office list for that country (website
  // countryAndCity codes); the firm list itself waits for Apply.
  onCountryChange(e) {
    const index = Number(e.detail.value);
    const country = index ? this.data.countryOptions[index] : '';
    const self = this;
    this.setData({
      countryIndex: index,
      offices: [],
      officesLabel: officesLabel(country),
      openGroups: { offices: true, areas: this.data.openGroups.areas },
      activeFilterCount: this.countFilters(index, [], this.data.areas, this.data.keyword, this.data.sortIndex)
    });
    const applyCities = function (cities) {
      self.setData({ officeOptions: withChecked(cities, []) });
    };
    if (!country) {
      applyCities(this.data.allCities);
      return;
    }
    api.getCitiesByCountry(country).then(applyCities).catch(function () {
      applyCities(self.data.allCities);
    });
  },

  onOfficesChange(e) {
    const offices = e.detail.value || [];
    this.setData({
      offices: offices,
      officeOptions: withChecked(this.data.officeOptions.map(function (o) { return o.value; }), offices),
      activeFilterCount: this.countFilters(this.data.countryIndex, offices, this.data.areas, this.data.keyword, this.data.sortIndex)
    });
  },

  onAreasChange(e) {
    const areas = e.detail.value || [];
    this.setData({
      areas: areas,
      areaOptions: withChecked(this.data.areaOptions.map(function (o) { return o.value; }), areas),
      activeFilterCount: this.countFilters(this.data.countryIndex, this.data.offices, areas, this.data.keyword, this.data.sortIndex)
    });
  },

  onInput(e) {
    this.setData({
      keyword: e.detail.value,
      activeFilterCount: this.countFilters(this.data.countryIndex, this.data.offices, this.data.areas, e.detail.value, this.data.sortIndex)
    });
  },

  onSortChange(e) {
    const index = Number(e.detail.value);
    this.setData({
      sortIndex: index,
      activeFilterCount: this.countFilters(this.data.countryIndex, this.data.offices, this.data.areas, this.data.keyword, index)
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
      keyword: '',
      countryIndex: 0,
      offices: [],
      areas: [],
      sortIndex: 0,
      officesLabel: officesLabel(''),
      officeOptions: withChecked(this.data.allCities, []),
      areaOptions: withChecked(this.data.areaOptions.map(function (o) { return o.value; }), []),
      openGroups: { offices: false, areas: false },
      activeFilterCount: 0,
      filtersOpen: false
    });
    this.fetch(true);
  },

  buildOptions(page) {
    const options = { max: PER_PAGE, start: (page - 1) * PER_PAGE + 1 };
    const keyword = (this.data.keyword || '').trim();
    if (keyword) options.search = keyword;
    if (this.data.countryIndex) options.countries = [this.data.countryOptions[this.data.countryIndex]];
    if (this.data.offices.length) options.office = this.data.offices;
    if (this.data.areas.length) options.categories = this.data.areas;
    if (this.data.sortIndex) options.orderby = SORT_VALUES[this.data.sortIndex];
    return options;
  },

  fetch(reset) {
    const self = this;
    const page = reset ? 1 : this.data.page + 1;
    this.setData({ loading: true });
    return api.getLawfirms(this.buildOptions(page)).then(function (items) {
      // The public endpoint can legitimately answer with an empty first page
      // while its index is refreshing. Keep the directory useful by showing
      // the bundled LegalOne snapshot in that case.
      if (reset && !items.length && !self.data.countryIndex &&
          !self.data.offices.length && !self.data.areas.length) {
        const rows = fallbackRows(self.data.keyword);
        self.setData({ items: rows, page: 1, hasMore: false, loading: false });
        return;
      }
      const rows = reset ? items : self.data.items.concat(items);
      self.setData({
        items: rows,
        page: page,
        hasMore: items.length >= PER_PAGE,
        loading: false
      });
    }).catch(function () {
      if (!reset) {
        self.setData({ loading: false, hasMore: false });
        return;
      }
      const rows = fallbackRows(self.data.keyword);
      self.setData({ items: rows, page: 1, hasMore: false, loading: false });
    });
  },

  goDetail(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(d.id || '') + '&name=' + encodeURIComponent(d.name || '')
    });
  }
});
