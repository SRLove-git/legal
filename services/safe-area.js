const app = getApp();
const initialStatusBarHeight = (app && app.globalData && app.globalData.statusBarHeight) || 20;

module.exports = Behavior({
  data: {
    statusBarHeight: initialStatusBarHeight
  }
});
