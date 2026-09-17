const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const privacy = require('../../data/privacy.js');
Page({
  behaviors: [safeArea, breadcrumb],
  data: { html: privacy.html }
});
