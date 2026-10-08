const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const api = require('../../services/api.js');
const fb = require('../../services/fallback.js');

const PER_PAGE = 12;
// Current website filter codes. These also act as a complete offline baseline
// while the public code endpoints are loading or temporarily unavailable.
const ADMISSION_OPTIONS = [
  'China', 'England and Wales - Solicitor', 'Hong Kong SAR',
  'India - Bar Council of West Bengal', 'Japan (Attorney at Law (Bengoshi))',
  'Singapore (Foreign Practitioner Certificate)', 'Singapore (FPC)', 'South Africa',
  'United Arab Emirates - ADGM Courts', 'United States - California',
  'United States - Illinois', 'United States - New Jersey', 'United States - New York'
];
const POSITION_OPTIONS = [
  'Associate', 'Attorney', 'Barrister', 'CEO', 'Consultant', 'Coordinator', 'Counsel',
  'Foreign Attorney', 'Foreign Legal Consultant', 'Founder', 'Founding Partner',
  'Global Vice-Chair', 'Head of Office', 'Junior Associate', 'Legal Adviser',
  'Legal Associate', 'Managing Partner', 'Of Counsel', 'Partner', 'Principal Associate',
  'Senior Advisor', 'Senior Associate', 'Senior Chair', 'Senior Partner', 'Trainee Lawyer'
];
const LANGUAGE_OPTIONS = [
  'Chinese', 'Dutch', 'English', 'French', 'German', 'Hindi', 'Indonesian', 'Italian',
  'Japanese', 'Khmer', 'Lao', 'Mandarin', 'Thai', 'Vietnamese'
];
const AREA_OPTIONS = [
  'Administrative Litigation', 'Antitrust and Competition', 'Aviation', 'Banking and Finance',
  'Business Crime', 'Capital Markets (Debt)', 'Capital Markets (Equity)',
  'Corporate and Commercial', 'Corporate Compliance', 'Corporate Finance', 'Data and Privacy',
  'Digital Assets', 'Dispute Resolution', 'Education', 'Employment and Labour',
  'Energy and Natural Resources', 'Entertainment and Sports', 'Environmental Law',
  'Family Wealth/Private Wealth', 'Fintech', 'Healthcare, Pharma and Life Sciences',
  'Hospitality and Tourism', 'Industrials and Manufacturing', 'Infrastructure',
  'Insurance and Reinsurance', 'International Trade', 'Investment Funds', 'IP (Copyright)',
  'IP (Patent)', 'IP (Trade Secrets)', 'IP (Trademark)', 'IP and Unfair Competition',
  'Islamic Finance', 'Joint Venture', 'M&A', 'New Energy Vehicle', 'PE/VC', 'Project Finance',
  'Real Estate and Construction', 'REITs', 'Restructuring and Insolvency',
  'Retail and Consumer', 'Securitisation and Structured Finance', 'Shipping and Maritime Affairs',
  'Taxation', 'TMT and Internet', 'White-Collar Crime', 'International Sanction'
];
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

function mergeOptions(baseline, live) {
  const values = baseline.slice();
  (live || []).forEach(function (value) {
    if (value && values.indexOf(value) < 0) values.push(value);
  });
  return values;
}

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
    openSelect: '',
    activeFilterCount: 0,
    admissionOptions: ['Admission'].concat(ADMISSION_OPTIONS),
    positionOptions: ['Positions'].concat(POSITION_OPTIONS),
    languageOptions: ['Languages'].concat(LANGUAGE_OPTIONS),
    areaOptions: ['Practice areas and industries'].concat(AREA_OPTIONS),
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
        admissionOptions: ['Admission'].concat(mergeOptions(ADMISSION_OPTIONS, filters.admissions)),
        positionOptions: ['Positions'].concat(mergeOptions(POSITION_OPTIONS, filters.positions)),
        languageOptions: ['Languages'].concat(mergeOptions(LANGUAGE_OPTIONS, filters.languages)),
        areaOptions: ['Practice areas and industries'].concat(mergeOptions(AREA_OPTIONS, filters.areas))
      });
    }).catch(function () {});
  },

  // Tapping anywhere outside a dropdown closes the one that is open.
  closeDropdowns() {
    if (!this.data.openSelect) return;
    this.setData({ openSelect: '' });
  },

  toggleFilters() {
    const filtersOpen = !this.data.filtersOpen;
    this.setData({ filtersOpen: filtersOpen, openSelect: filtersOpen ? this.data.openSelect : '' });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  toggleSelect(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ openSelect: this.data.openSelect === filter ? '' : filter });
  },

  onSelectOption(e) {
    const filter = e.currentTarget.dataset.filter;
    const keyMap = {
      admission: 'admissionIndex',
      position: 'positionIndex',
      language: 'languageIndex',
      area: 'areaIndex',
      sort: 'sortIndex'
    };
    const key = keyMap[filter];
    if (!key) return;
    let index = Number(e.currentTarget.dataset.index);
    // Picking the value that is already selected clears it again, the same as
    // choosing the placeholder at the top of the list.
    if (index === this.data[key]) index = 0;
    const update = {};
    update[key] = index;
    update.openSelect = '';
    this.setData(update, () => this.updateFilterCount());
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
    this.setData({ filtersOpen: false, openSelect: '' });
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
      filtersOpen: false,
      openSelect: ''
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
