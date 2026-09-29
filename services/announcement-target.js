// Announcements often act as pointers to content that already has a native
// mini-program detail page. Reuse that page instead of rendering a second copy.
function sitePath(url) {
  const value = String(url || '');
  const absolute = value.match(/^https?:\/\/([^/]+)/i);
  if (absolute && !/(^|\.)legaloneglobal\.com$/i.test(absolute[1].split(':')[0])) return '';
  return value
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('#')[0]
    .split('?')[0];
}

function detailUrl(item) {
  const path = sitePath(item && item.url);
  const title = encodeURIComponent((item && (item.headline || item.title || item.name)) || '');
  let match = path.match(/^\/articles\/(a-[^/]+)\/?$/i);
  if (match) return '/pages/article-detail/article-detail?id=' + encodeURIComponent(match[1]) + '&title=' + title;

  match = path.match(/^\/deal\/(d-[^/]+)\/?$/i);
  if (match) return '/pages/deal-detail/deal-detail?id=' + encodeURIComponent(match[1]) + '&title=' + title;

  match = path.match(/^\/profile\/lawyers\/(l-[^/]+)\/?$/i);
  if (match) return '/pages/lawyer-detail/lawyer-detail?id=' + encodeURIComponent(match[1]) + '&name=' + title;

  match = path.match(/^\/profile\/lawfirms\/([^/]+)\/?$/i);
  if (match) return '/pages/lawfirm-detail/lawfirm-detail?id=' + encodeURIComponent(match[1]) + '&name=' + title;

  match = path.match(/^\/profile\/lawfirm_office\/([^/]+)\/([^/]+)\/?$/i);
  if (match) {
    return '/pages/lawfirm-office/lawfirm-office?firmId=' + encodeURIComponent(match[1]) +
      '&officeId=' + encodeURIComponent(match[2]) + '&name=' + title;
  }

  return '';
}

module.exports = { detailUrl: detailUrl };
