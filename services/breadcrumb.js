// Breadcrumb behaviour. The website's crumbs are links: the home logo points at "./"
// and the section label points at that section's list page. Every page that renders
// a breadcrumb registers this so the icon and the section label are tappable.
module.exports = Behavior({
  methods: {
    goHome() {
      wx.reLaunch({ url: '/pages/index/index' });
    },
    goCrumb(e) {
      const url = (e.currentTarget.dataset || {}).url;
      if (!url) return;
      wx.navigateTo({
        url: url,
        fail() {
          wx.reLaunch({ url });
        }
      });
    }
  }
});
