App({
  globalData: {
    siteName: 'LegalOne',
    origin: 'https://www.legaloneglobal.com',
    statusBarHeight: 20,
    headerRightPadding: 16
  },
  onLaunch() {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.globalData.statusBarHeight = info.statusBarHeight || 20;
      let rightPad = 16;
      if (typeof wx.getMenuButtonBoundingClientRect === 'function') {
        const rect = wx.getMenuButtonBoundingClientRect();
        if (rect && rect.left > 0) {
          rightPad = Math.max(16, info.windowWidth - rect.left + 6);
        }
      }
      this.globalData.headerRightPadding = rightPad;
    } catch (e) {
      this.globalData.statusBarHeight = 20;
      this.globalData.headerRightPadding = 16;
    }
  }
});
