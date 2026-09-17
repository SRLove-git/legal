const safeArea = require('../../services/safe-area.js');
const esg = require('../../data/esg.js');
Page({
  behaviors: [safeArea],
  data: { html: esg.html }
});
