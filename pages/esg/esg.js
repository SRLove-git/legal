const safeArea = require('../../services/safe-area.js');
const data = require('../../data/content.js');
Page({
  behaviors: [safeArea], data: { body: data.esg } });
