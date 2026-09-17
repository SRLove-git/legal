const safeArea = require('../../services/safe-area.js');
const cookie = require('../../data/cookie.js');
Page({
  behaviors: [safeArea],
  data: { html: cookie.html }
});
