// Convert first-party CMS HTML into markup supported by the mini-program
// <rich-text> component. The CMS is trusted, but executable/embedded content is
// removed before rendering and website-relative asset URLs are made absolute.
const ORIGIN = 'https://www.legaloneglobal.com';
const CDN = 'https://legaloneglobal.azureedge.net/storelegaloneglobalpub/';
const LEGACY_BLOB = /^https:\/\/storelegaloneprod\.blob\.core\.windows\.net\/storelegaloneglobalpub\//i;

function addStyle(html, tag, baseStyle) {
  const pattern = new RegExp('<' + tag + '([^>]*)>', 'gi');
  return html.replace(pattern, function (whole, attributes) {
    let selfClosing = '';
    if (/\/\s*$/.test(attributes)) {
      attributes = attributes.replace(/\/\s*$/, '');
      selfClosing = ' /';
    }
    const stylePattern = /\sstyle\s*=\s*(["'])([\s\S]*?)\1/i;
    if (stylePattern.test(attributes)) {
      attributes = attributes.replace(stylePattern, function (_, quote, value) {
        return ' style=' + quote + baseStyle + value + quote;
      });
    } else {
      attributes += ' style="' + baseStyle + '"';
    }
    return '<' + tag + attributes + selfClosing + '>';
  });
}

function addClassStyle(html, className, baseStyle) {
  return html.replace(/<([a-z][\w-]*)([^>]*)>/gi, function (whole, tag, attributes) {
    const match = attributes.match(/\sclass\s*=\s*(["'])([^"']*)\1/i);
    if (!match || match[2].split(/\s+/).indexOf(className) < 0) return whole;
    return addStyle(whole, tag, baseStyle);
  });
}

// The CMS keeps Word-style inline sizing on pasted images ("width: 5.5885in",
// "height: 2.9218in", width/height attributes), which the website drops when it
// sanitises article HTML. Reproduce that here so an image can never be wider
// than the reader's screen and always keeps its own aspect ratio.
function normalizeImages(html) {
  const sizing = 'display:block;width:100%;max-width:100%;height:auto;margin:16px auto;';
  return html.replace(/<img\b([^>]*?)(\/?)>/gi, function (whole, attributes, selfClosing) {
    let cleaned = attributes.replace(/\s(?:width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    const styleMatch = cleaned.match(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i);
    if (styleMatch) {
      const kept = styleMatch[2].split(';').filter(function (declaration) {
        return declaration.trim() &&
          !/^\s*(?:width|height|max-width|max-height|min-width|min-height|object-fit|transform)\s*:/i.test(declaration);
      }).join(';');
      cleaned = cleaned.replace(styleMatch[0],
        ' style=' + styleMatch[1] + (kept ? kept + ';' : '') + sizing + styleMatch[1]);
    } else {
      cleaned += ' style="' + sizing + '"';
    }
    return '<img' + cleaned + (selfClosing ? ' /' : '') + '>';
  });
}

// League-table title artwork sits flush against the table on the website.
// The generic article image margin otherwise adds 32px to every table and
// makes the stacked Deals of the Year section noticeably taller.
function normalizeDotyHeaderImages(html) {
  return html.replace(/<div\b[^>]*class\s*=\s*(["'])[^"']*\bdoty-header-container\b[^"']*\1[^>]*>[\s\S]*?<\/div>/gi,
    function (block) {
      return block.replace(/margin:16px auto;/gi, 'margin:0 auto;');
    });
}

// Some older CMS award templates still point directly at the backing Azure
// Blob account. That host is not one of the mini program's download domains,
// while the same files are available through LegalOne's configured CDN. The
// templates also contain literal spaces and HTML-escaped ampersands in paths
// (for example "W&amp;HTeam/Member/Yunzhao GENG.png"), so make those paths safe
// before handing them to <rich-text>.
function normalizeAssetUrl(value) {
  let url = String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#0*38;/gi, '&')
    .replace(/&#x0*26;/gi, '&')
    .replace(LEGACY_BLOB, CDN)
    // Stellar Team templates mix website-relative /images URLs with direct
    // Blob URLs. Both sets exist in the public CDN container, so keep every
    // card and member portrait on the mini program's single image domain.
    .replace(/^\/images\/(StellarTeam\/)/i, CDN + '$1');

  if (!/^(?:https?:\/\/|\/)/i.test(url)) return url;

  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  if (hashAt >= 0) url = url.slice(0, hashAt);
  const queryAt = url.indexOf('?');
  const query = queryAt >= 0 ? url.slice(queryAt) : '';
  let path = queryAt >= 0 ? url.slice(0, queryAt) : url;
  path = path.replace(/ /g, '%20').replace(/&/g, '%26');
  return path + query + hash;
}

// Native <image> cards do not pass through the HTML attribute rewriter below.
// Expose the same normalization as an absolute URL helper so award cards and
// <rich-text> images always receive identical, mini-program-safe addresses.
function toAbsoluteAssetUrl(value) {
  const url = normalizeAssetUrl(value);
  if (!url || /^(?:https?:|data:)/i.test(url)) return url;
  return url.charAt(0) === '/' ? ORIGIN + url : ORIGIN + '/' + url.replace(/^\.\//, '');
}

function absoluteUrls(html) {
  return html.replace(/\s(src|href)\s*=\s*(["'])([^"']*)\2/gi, function (whole, name, quote, url) {
    if (name.toLowerCase() === 'src') url = toAbsoluteAssetUrl(url);
    if (!url) return whole;
    if (/^(?:https?:|data:|mailto:|tel:|#)/i.test(url)) {
      return ' ' + name + '=' + quote + url + quote;
    }
    const absolute = url.charAt(0) === '/' ? ORIGIN + url : ORIGIN + '/' + url.replace(/^\.\//, '');
    return ' ' + name + '=' + quote + absolute + quote;
  });
}

function toRichHtml(value) {
  if (!value) return '';
  let html = String(value)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*\/?\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:src|href)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, '');

  html = absoluteUrls(html);
  html = addStyle(html, 'p', 'margin:0 0 24px;text-align:justify;');
  html = addStyle(html, 'h1', 'font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:26px;line-height:1.25;font-weight:700;color:#303030;margin:28px 0 18px;');
  html = addStyle(html, 'h2', 'font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:#00558d;margin:26px 0 16px;');
  html = addStyle(html, 'h3', 'font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:18px;line-height:1.4;font-weight:700;color:#00558d;margin:22px 0 14px;');
  html = addStyle(html, 'ul', 'margin:0 0 24px;padding-left:22px;color:#303030;');
  html = addStyle(html, 'ol', 'margin:0 0 24px;padding-left:22px;color:#303030;');
  html = addStyle(html, 'li', 'margin:0 0 10px;');
  html = addStyle(html, 'a', 'color:#0084ba;text-decoration:none;word-break:break-word;');
  html = normalizeImages(html);
  html = normalizeDotyHeaderImages(html);
  html = addStyle(html, 'table', 'display:table;width:100%;border-collapse:collapse;table-layout:fixed;margin:20px 0;color:#303030;');
  html = addStyle(html, 'thead', 'background:#00558d;color:#ffffff;');
  html = addStyle(html, 'th', 'border:1px solid #00558d;padding:8px 6px;font-size:14px;line-height:1.4;font-weight:700;text-align:left;word-break:break-word;');
  html = addStyle(html, 'td', 'border:1px solid #99cee3;padding:8px 6px;font-size:14px;line-height:1.4;vertical-align:top;word-break:break-word;');
  html = addStyle(html, 'blockquote', 'margin:20px 0;padding:14px 18px;border-left:4px solid #0284c7;background:#f5f8fa;color:#303030;');

  // Deals of the Year articles use div-based six-column league tables rather
  // than semantic <table> markup. Recreate the website's mobile grid because
  // class selectors outside <rich-text> do not cascade into its node tree.
  html = addClassStyle(html, 'doty-table', 'display:grid;grid-template-columns:9% 41% repeat(4,12.5%);width:100%;margin:0;background:#e7f3f8;font-size:14px;line-height:1.35;overflow:hidden;');
  html = addClassStyle(html, 'doty-table-colspan-6', 'grid-column:1 / span 6;');
  html = addClassStyle(html, 'doty-table-cell', 'min-width:0;padding:6px 4px;border-top:1px solid #fff;border-bottom:1px solid #fff;font-size:14px;text-align:center;word-break:break-word;');
  html = addClassStyle(html, 'table-header', 'display:none;');
  html = addClassStyle(html, 'mobile-table-header', 'display:block;background:#a1cee4;font-weight:700;');
  html = addClassStyle(html, 'lawfirm-name', 'text-align:left;');
  html = addClassStyle(html, 'highlight', 'background:#d2e8f2;border-color:#e7f3f8;');
  html = addClassStyle(html, 'doty-table-footer', 'display:block;grid-column:1 / span 6;font-size:12px;');
  html = addClassStyle(html, 'rank1IconMedium', 'display:inline-block;width:16px;height:21px;background:url(https://www.legaloneglobal.com/images/LegalOne_Merits_Distinguished_Icon_Medium.png) no-repeat center/contain;');
  html = addClassStyle(html, 'rank2IconMedium', 'display:inline-block;width:16px;height:21px;background:url(https://www.legaloneglobal.com/images/LegalOne_Merits_Exemplary_Icon_Medium.png) no-repeat center/contain;');
  html = addClassStyle(html, 'rank3IconMedium', 'display:inline-block;width:16px;height:21px;background:url(https://www.legaloneglobal.com/images/LegalOne_Merits_Remarkable_Icon_Medium.png) no-repeat center/contain;');
  return '<div style="font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;letter-spacing:0.3px;color:#303030;">' + html + '</div>';
}

module.exports = { toRichHtml, toAbsoluteAssetUrl };
