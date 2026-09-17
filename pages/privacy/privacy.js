const safeArea = require('../../services/safe-area.js');
const privacy = require('../../data/privacy.js');
Page({
  behaviors: [safeArea],
  data: { html: privacy.html }
});
