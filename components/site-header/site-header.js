Component({
  data: {
    menuOpen: false,
    dealsMenuOpen: false,
    keyword: '',
    loggedIn: false,
    statusBarHeight: 20,
    headerRightPadding: 16,
    nav: [
      { label: 'Home', path: '/pages/index/index' },
      { label: 'Announcements', path: '/pages/announcements/announcements' },
      {
        label: 'Deals / Cases',
        path: '/pages/deals/deals',
        children: [
          { label: 'Methodology', path: '/pages/deal-case-intro/deal-case-intro?section=methodology' },
          { label: 'Deals of the Year', path: '/pages/deal-case-intro/deal-case-intro?section=doty' },
          { label: 'Frequently asked questions', path: '/pages/deal-case-intro/deal-case-intro?section=faq' }
        ]
      },
      { label: 'Awards', path: '/pages/awards/awards' },
      { label: 'Articles', path: '/pages/articles/articles' },
      { label: 'Lawyers', path: '/pages/lawyers/lawyers' },
      { label: 'Law Firms', path: '/pages/lawfirms/lawfirms' },
      { label: 'About', path: '/pages/about/about' }
    ]
  },
  lifetimes: {
    attached() {
      const app = getApp();
      const statusBarHeight = (app && app.globalData && app.globalData.statusBarHeight) || 20;
      const headerRightPadding = (app && app.globalData && app.globalData.headerRightPadding) || 16;
      this.setData({ statusBarHeight, headerRightPadding });
      this.refreshAuth();
    }
  },
  pageLifetimes: {
    show() {
      this.refreshAuth();
    }
  },
  methods: {
    refreshAuth() {
      const token = wx.getStorageSync('X-ACCESS-TOKEN');
      this.setData({ loggedIn: !!token });
    },
    toggleMenu() {
      this.setData({ menuOpen: !this.data.menuOpen });
    },
    closeMenu() {
      this.setData({ menuOpen: false, dealsMenuOpen: false });
    },
    toggleDealsMenu() {
      this.setData({ dealsMenuOpen: !this.data.dealsMenuOpen });
    },
    onNav(e) {
      const path = e.currentTarget.dataset.path;
      this.setData({ menuOpen: false, dealsMenuOpen: false });
      if (!path) return;
      wx.navigateTo({ url: path });
    },
    goHome() {
      this.setData({ menuOpen: false });
      wx.reLaunch({ url: '/pages/index/index' });
    },
    goAi() {
      this.setData({ menuOpen: false });
      wx.navigateTo({ url: '/pages/ai-search/ai-search' });
    },
    onKeyword(e) {
      this.setData({ keyword: e.detail.value });
    },
    onSearch() {
      const kw = (this.data.keyword || '').trim();
      this.setData({ menuOpen: false });
      if (kw) {
        wx.navigateTo({ url: '/pages/ai-search/ai-search?keyword=' + encodeURIComponent(kw) });
      }
    },
    goLogin() {
      this.setData({ menuOpen: false });
      wx.navigateTo({ url: '/pages/login/login' });
    },
    goAccount() {
      this.setData({ menuOpen: false });
      wx.navigateTo({ url: '/pages/dashboard/dashboard' });
    },
    goLogout() {
      this.setData({ menuOpen: false });
      wx.removeStorageSync('X-ACCESS-TOKEN');
      wx.removeStorageSync('memberId');
      this.refreshAuth();
      wx.showToast({ title: 'Signed out', icon: 'none' });
    },
    noop() {}
  }
});
