const data = require('../../data/content.js');
Page({
  data: {
    keyword: '',
    prompts: ['Find a lawyer', 'Find a law firm', 'Find legal insights', 'Find a deal or case'],
    results: []
  },
  onLoad(options) {
    if (options && options.keyword) {
      this.setData({ keyword: options.keyword });
      this.search(options.keyword);
    }
  },
  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },
  usePrompt(e) {
    this.setData({ keyword: e.currentTarget.dataset.text });
    this.search(e.currentTarget.dataset.text);
  },
  search(e) {
    let kw = this.data.keyword;
    if (typeof e === 'string') {
      kw = e;
    } else if (e && e.detail && e.detail.value !== undefined) {
      kw = e.detail.value;
    }
    const q = (kw || '').trim().toLowerCase();
    if (!q) {
      this.setData({ results: [] });
      return;
    }
    const out = [];
    data.lawyers.forEach(function (it) {
      if ((it.name + ' ' + it.firm + ' ' + it.location).toLowerCase().indexOf(q) >= 0) {
        out.push({ type: 'Lawyer', title: it.name, sub: it.firm, page: '/pages/lawyer-detail/lawyer-detail', param: 'name' });
      }
    });
    data.lawfirms.forEach(function (it) {
      if (it.name.toLowerCase().indexOf(q) >= 0) {
        out.push({ type: 'Law Firm', title: it.name, sub: '', page: '/pages/lawfirm-detail/lawfirm-detail', param: 'name' });
      }
    });
    data.deals.forEach(function (it) {
      if (it.title.toLowerCase().indexOf(q) >= 0) {
        out.push({ type: 'Deal / Case', title: it.title, sub: it.date, page: '/pages/deal-detail/deal-detail', param: 'title' });
      }
    });
    data.latest.concat(data.highlights).forEach(function (it) {
      if (it.title.toLowerCase().indexOf(q) >= 0) {
        out.push({ type: 'Article', title: it.title, sub: it.date, page: '/pages/article-detail/article-detail', param: 'title' });
      }
    });
    this.setData({ results: out.slice(0, 30) });
  },
  goResult(e) {
    const { page, param, value } = e.currentTarget.dataset;
    wx.navigateTo({ url: page + '?' + param + '=' + encodeURIComponent(value) });
  }
});
