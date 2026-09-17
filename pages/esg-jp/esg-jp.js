const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const esgJp = require('../../data/esg-jp.js');
Page({
  behaviors: [safeArea, breadcrumb],
  data: { html: esgJp.html }
});
