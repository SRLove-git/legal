const safeArea = require('../../services/safe-area.js');
const esgJp = require('../../data/esg-jp.js');
Page({
  behaviors: [safeArea],
  data: { html: esgJp.html }
});
