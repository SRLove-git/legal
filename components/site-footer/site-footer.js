const h5 = require('../../services/h5.js');

// The website links its footer ISSN logo to the ISSN registry portal.
const ISSN_URL = 'https://portal.issn.org/resource/ISSN/3006-2756';

Component({
  data: {
    cookieVisible: true
  },
  methods: {
    okCookie() {
      this.setData({ cookieVisible: false });
    },
    goHome() {
      wx.reLaunch({ url: '/pages/index/index' });
    },
    openIssn() {
      h5.openExternal(ISSN_URL, 'ISSN 3006-2756');
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
