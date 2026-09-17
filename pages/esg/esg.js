const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const esg = require('../../data/esg.js');
Page({
  behaviors: [safeArea, breadcrumb],
  data: { html: esg.html }
});
