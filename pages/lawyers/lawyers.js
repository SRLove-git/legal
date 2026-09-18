const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

const PER_PAGE = 12;
const SORT_VALUES = [
  '',
  'numOfDeal desc',
  'numOfDeal asc',
  'numRating desc',
  'numRating asc',
  'firstName desc',
  'firstName asc',
  'name desc',
  'name asc'
];

function completeLawyer(item) {
  return Object.assign({
    id: '',
    name: '',
    nameLocal: '',
    image: '',
    positions: [],
    firm: '',
    location: '',
    contacts: [],
    verified: false,
    numOfDeal: 0,
    distinguished: 0,
    exemplary: 0,
    remarkable: 0,
    testimonials: 0
  }, item || {});
}

Page({
  behaviors: [safeArea, breadcrumb],

  data: {
    items: [],
    sortFilterLabel: 'SORT & FILTER',
    keyword: '',
    page: 1,
    hasMore: true,
    loading: false,
    filtersOpen: false,
    activeFilterCount: 0,
    admissionOptions: ['Admission'],
    positionOptions: ['Positions'],
    languageOptions: ['Languages'],
    areaOptions: ['Practice areas and industries'],
    sortOptions: [
      'Sort',
      'No. of deals ▼',
      'No. of deals ▲',
      'No. of testimonials ▼',
      'No. of testimonials ▲',
      'First name ▼',
      'First name ▲',
      'Surname ▼',
      'Surname ▲'
    ],
    admissionIndex: 0,
    positionIndex: 0,
    languageIndex: 0,
    areaIndex: 0,
    sortIndex: 0
  },

  onLoad(options) {
    if (options && options.keyword) this.setData({ keyword: options.keyword });
    this.loadFilters();
    this.fetch(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.fetch(false);
  },

  onPullDownRefresh() {
    this.fetch(true).then(function () { wx.stopPullDownRefresh(); });
  },

  loadFilters() {
    const self = this;
    api.getLawyerFilters().then(function (filters) {
      self.setData({
        admissionOptions: ['Admission'].concat(filters.admissions || []),
        positionOptions: ['Positions'].concat(filters.positions || []),
        languageOptions: ['Languages'].concat(filters.languages || []),
        areaOptions: ['Practice areas and industries'].concat(filters.areas || [])
      });
    }).catch(function () {});
  },

  toggleFilters() {
    this.setData({ filtersOpen: !this.data.filtersOpen });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    const keyMap = {
      admission: 'admissionIndex',
      position: 'positionIndex',
      language: 'languageIndex',
      area: 'areaIndex'
    };
    const key = keyMap[filter];
    if (!key) return;
    const update = {};
    update[key] = Number(e.detail.value);
    this.setData(update);
    this.updateFilterCount();
  },

  onSortChange(e) {
    this.setData({ sortIndex: Number(e.detail.value) });
    this.updateFilterCount();
  },

  updateFilterCount() {
    const count = [
      this.data.admissionIndex,
      this.data.positionIndex,
      this.data.languageIndex,
      this.data.areaIndex,
      this.data.sortIndex
    ].filter(function (value) { return value > 0; }).length;
    this.setData({ activeFilterCount: count });
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
      admissionIndex: 0,
      positionIndex: 0,
      languageIndex: 0,
      areaIndex: 0,
      sortIndex: 0,
      activeFilterCount: 0,
      filtersOpen: false
    });
    this.fetch(true);
  },

  buildOptions(page) {
    const options = {
      max: PER_PAGE,
      start: (page - 1) * PER_PAGE + 1
    };
    const keyword = (this.data.keyword || '').trim();
    if (keyword) options.search = keyword;
    if (this.data.admissionIndex) options.admission = this.data.admissionOptions[this.data.admissionIndex];
    if (this.data.positionIndex) options.position = this.data.positionOptions[this.data.positionIndex];
    if (this.data.languageIndex) options.language = this.data.languageOptions[this.data.languageIndex];
    if (this.data.areaIndex) options.areas = this.data.areaOptions[this.data.areaIndex];
    if (this.data.sortIndex) options.orderby = SORT_VALUES[this.data.sortIndex];
    return options;
  },

  fetch(reset) {
    if (this.data.loading) return Promise.resolve();
    const self = this;
    const page = reset ? 1 : this.data.page + 1;
    const options = this.buildOptions(page);
    this.setData({ loading: true });

    return api.getLawyers(options).then(function (result) {
      const rows = (result || []).map(completeLawyer);
      self.setData({
        items: reset ? rows : self.data.items.concat(rows),
        page: page,
        hasMore: rows.length === PER_PAGE,
        loading: false
      });
    }).catch(function () {
      const keyword = (self.data.keyword || '').trim().toLowerCase();
      const filtered = fb.lawyers.filter(function (item) {
        if (!keyword) return true;
        return (item.name + ' ' + item.firm + ' ' + item.location + ' ' + (item.positions || []).join(' '))
          .toLowerCase().indexOf(keyword) >= 0;
      });
      const rows = filtered.slice(0, page * PER_PAGE).map(completeLawyer);
      self.setData({
        items: rows,
        page: page,
        hasMore: rows.length < filtered.length,
        loading: false
      });
    });
  },

  goDetail(e) {
    const data = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(data.id || '') +
        '&name=' + encodeURIComponent(data.name || '')
    });
  }
});
