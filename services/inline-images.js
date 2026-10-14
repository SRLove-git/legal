// Inline pictures in CMS article bodies arrive as base64 data URIs — this
// article alone carries 1.4 MB of them. Page.data is limited to 1 MB per
// setData call, and <rich-text> does not render data URIs anyway, so write each
// picture to the mini program's user directory once and hand the page a file
// path instead. Files are keyed by content, so revisiting an article reuses
// them.

function hash(value) {
  let result = 5381;
  for (let i = 0; i < value.length; i += 1) {
    result = ((result << 5) + result + value.charCodeAt(i)) >>> 0;
  }
  return result.toString(36);
}

function dataUriParts(src) {
  const match = /^data:image\/([a-z0-9+.-]+);base64,([\s\S]+)$/i.exec(String(src || ''));
  if (!match) return null;
  const extension = match[1].toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  return { extension: extension, base64: match[2].replace(/\s+/g, '') };
}

// Replaces every data-URI image in the blocks with a local file path. Images
// that cannot be written are dropped so a page can never ship a data URI into
// setData.
function materialize(blocks) {
  const list = blocks || [];
  let root = '';
  try {
    root = wx.env.USER_DATA_PATH;
  } catch (e) {
    root = '';
  }
  let manager = null;
  try {
    manager = wx.getFileSystemManager();
  } catch (e) {
    manager = null;
  }

  const pending = [];
  list.forEach(function (block) {
    if (!block || block.type !== 'image') return;
    const parts = dataUriParts(block.src);
    if (!parts) return;
    if (!root || !manager) {
      block.src = '';
      return;
    }
    const filePath = root + '/article-image-' + hash(parts.base64) + '.' + parts.extension;
    pending.push(new Promise(function (resolve) {
      try {
        manager.accessSync(filePath);
        block.src = filePath;
        resolve();
        return;
      } catch (e) {
        // Not cached yet — write it below.
      }
      manager.writeFile({
        filePath: filePath,
        data: parts.base64,
        encoding: 'base64',
        success: function () { block.src = filePath; resolve(); },
        fail: function () { block.src = ''; resolve(); }
      });
    }));
  });
  return Promise.all(pending).then(function () { return list; });
}

module.exports = { materialize: materialize };
