const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const cookie = require('../../data/cookie.js');
Page({
  behaviors: [safeArea, breadcrumb],
  data: { html: cookie.html }
});
