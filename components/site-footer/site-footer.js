Component({
  data: {
    cookieVisible: true
  },
  methods: {
    okCookie() {
      this.setData({ cookieVisible: false });
    },
    goTerms() {
      wx.navigateTo({ url: '/pages/terms/terms' });
    },
    goPrivacy() {
      wx.navigateTo({ url: '/pages/privacy/privacy' });
    },
    goEsg() {
      wx.navigateTo({ url: '/pages/esg/esg' });
    }
  }
});
