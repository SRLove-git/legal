const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');
const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');

const PER_PAGE = 12;
const RANK_NUMBERS = { Distinguished: 1, Exemplary: 2, Remarkable: 3 };

function withChecked(values, selected) {
  return (values || []).map(function (value) {
    return { value: value, checked: selected.indexOf(value) >= 0 };
  });
}

function completeDeal(item) {
  const row = Object.assign({}, item);
  row.labels = row.labels || [];
  row.rankNo = Number(row.rankNo) || RANK_NUMBERS[row.rank] || 0;
  row.image = row.image || '';
  row.value = row.value || '';
  return row;
}

Page({
  behaviors: [safeArea, breadcrumb],

  data: {
    items: [],
    keyword: '',
    page: 1,
    hasMore: true,
    loading: false,
    filtersOpen: false,
    openGroups: { jurisdictions: false, areas: false },
    years: ['Year'],
    yearIndex: 0,
    jurisdictions: [],
    areas: [],
    jurisdictionOptions: [],
    areaOptions: [],
    sortOptions: ['Sort', 'Value (USD) ↓', 'Value (USD) ↑'],
    sortValues: ['', 'val desc', 'val asc'],
    sortIndex: 0,
    activeFilterCount: 0
  },

  onLoad(options) {
    const currentYear = new Date().getFullYear();
    const years = ['Year'];
    for (let year = currentYear; year >= 2010; year -= 1) years.push(String(year));
    this.setData({
      years: years,
      keyword: options && options.keyword ? decodeURIComponent(options.keyword) : ''
    });
    this.loadFilters();
    this.fetch(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.fetch(false);
  },

  loadFilters() {
    const self = this;
    api.getDealFilters().then(function (filters) {
      self.setData({
        jurisdictionOptions: withChecked(filters.jurisdictions || [], self.data.jurisdictions),
        areaOptions: withChecked(filters.areas || [], self.data.areas)
      });
    }).catch(function () {});
  },

  startSubmission() {
    wx.navigateTo({ url: '/pages/dashboard/dashboard' });
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

  onYearChange(e) {
    this.setData({ yearIndex: Number(e.detail.value) }, () => this.updateFilterCount());
  },

  onSortChange(e) {
    this.setData({ sortIndex: Number(e.detail.value) }, () => this.updateFilterCount());
  },

  onFilterChange(e) {
    const group = e.currentTarget.dataset.group;
    const values = e.detail.value || [];
    const patch = {};
    patch[group] = values;
    patch[group === 'jurisdictions' ? 'jurisdictionOptions' : 'areaOptions'] = withChecked(
      group === 'jurisdictions'
        ? this.data.jurisdictionOptions.map(function (item) { return item.value; })
        : this.data.areaOptions.map(function (item) { return item.value; }),
      values
    );
    this.setData(patch, () => this.updateFilterCount());
  },

  updateFilterCount() {
    this.setData({
      activeFilterCount: (this.data.yearIndex ? 1 : 0) +
        this.data.jurisdictions.length + this.data.areas.length +
        (this.data.sortIndex ? 1 : 0)
    });
  },

  onApply() {
    this.setData({ filtersOpen: false });
    this.fetch(true);
  },

  onReset() {
    this.setData({
      yearIndex: 0,
      jurisdictions: [],
      areas: [],
      jurisdictionOptions: withChecked(this.data.jurisdictionOptions.map(function (item) { return item.value; }), []),
      areaOptions: withChecked(this.data.areaOptions.map(function (item) { return item.value; }), []),
      sortIndex: 0,
      activeFilterCount: 0,
      filtersOpen: false
    }, () => this.fetch(true));
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.fetch(true);
  },

  fetch(reset) {
    if (this.data.loading) return;
    const self = this;
    const page = reset ? 1 : this.data.page + 1;
    const options = {
      max: PER_PAGE,
      start: (page - 1) * PER_PAGE + 1,
      search: (this.data.keyword || '').trim(),
      year: this.data.yearIndex ? this.data.years[this.data.yearIndex] : '',
      jurisdictions: this.data.jurisdictions,
      areas: this.data.areas,
      orderby: this.data.sortValues[this.data.sortIndex]
    };
    this.setData({ loading: true });

    api.getDeals(options).then(function (rows) {
      if (reset && (!rows || !rows.length)) {
        self.useFallback(options, page);
        return;
      }
      const normalized = (rows || []).map(completeDeal);
      self.setData({
        items: reset ? normalized : self.data.items.concat(normalized),
        page: page,
        hasMore: normalized.length === PER_PAGE,
        loading: false
      });
    }).catch(function () {
      self.useFallback(options, page);
    });
  },

  useFallback(options, page) {
    const keyword = (options.search || '').toLowerCase();
    let rows = fb.deals.map(completeDeal).filter(function (item) {
      if (keyword && item.title.toLowerCase().indexOf(keyword) < 0) return false;
      if (options.year && String(item.date || '').indexOf(options.year) < 0) return false;
      if (options.jurisdictions.length && options.jurisdictions.indexOf(item.jurisdictionText) < 0) return false;
      if (options.areas.length && !item.labels.some(function (label) { return options.areas.indexOf(label) >= 0; })) return false;
      return true;
    });
    const visible = rows.slice(0, page * PER_PAGE);
    this.setData({ items: visible, page: page, hasMore: visible.length < rows.length, loading: false });
  },

  goDetail(e) {
    const d = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(d.id || '') +
        '&title=' + encodeURIComponent(d.title || '')
    });
  }
});
