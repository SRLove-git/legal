const safeArea = require('../../services/safe-area.js');
const breadcrumb = require('../../services/breadcrumb.js');
const data = require('../../data/content.js');
Page({
  behaviors: [safeArea, breadcrumb], data: { body: data.terms } });
