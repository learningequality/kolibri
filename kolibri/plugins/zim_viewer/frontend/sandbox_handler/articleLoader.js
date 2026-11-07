import { getAbsoluteFilePath, getCSSPaths, replaceCSSPaths } from 'kolibri-zip/src/fileUtils';
import { isInternal } from './refs';

const QUERY_OR_HASH_RE = /[?#].*$/;
const CSS_MIMETYPE = 'text/css';
const HTML_MIMETYPES = ['text/html', 'application/xhtml+xml'];

const RESOURCE_ATTR_SELECTOR =
  'img[src],script[src],source[src],audio[src],video[src],track[src],embed[src],link[rel~="stylesheet"][href]';

function attrFor(el) {
  return el.hasAttribute('src') ? 'src' : 'href';
}

// ZIM stores paths decoded exactly once (HTML '%252C' -> stored '%2C').
function refKey(value) {
  return value.replace(QUERY_OR_HASH_RE, '');
}

function splitSrcset(srcset) {
  return srcset.split(/,(?![^(]*\))/g);
}

function mimeEssence(mimetype) {
  return mimetype.split(';')[0].trim().toLowerCase();
}

function decodeText(data, mimetype) {
  const charset = /;\s*charset\s*=\s*"?([^";\s]+)/i.exec(mimetype);
  try {
    return new TextDecoder(charset ? charset[1] : 'utf-8').decode(data);
  } catch (e) {
    return new TextDecoder('utf-8').decode(data);
  }
}

function blobUrl(data, mimetype) {
  return URL.createObjectURL(new Blob([data], { type: mimetype || 'application/octet-stream' }));
}

function collectArticleRefs(doc) {
  const refs = [];
  for (const el of doc.querySelectorAll(RESOURCE_ATTR_SELECTOR)) {
    const value = el.getAttribute(attrFor(el));
    if (isInternal(value)) {
      refs.push(refKey(value));
    }
  }
  for (const el of doc.querySelectorAll('[srcset]')) {
    for (const entry of splitSrcset(el.getAttribute('srcset'))) {
      const url = entry.trim().split(/\s+/)[0];
      if (isInternal(url)) {
        refs.push(refKey(url));
      }
    }
  }
  for (const el of doc.querySelectorAll('[style]')) {
    refs.push(...getCSSPaths(el.getAttribute('style')));
  }
  for (const block of doc.getElementsByTagName('style')) {
    refs.push(...getCSSPaths(block.textContent || ''));
  }
  return refs;
}

function applyArticleRewrites(doc, replacements) {
  for (const el of doc.querySelectorAll(RESOURCE_ATTR_SELECTOR)) {
    const attr = attrFor(el);
    const url = replacements[refKey(el.getAttribute(attr))];
    if (url) {
      el.setAttribute(attr, url);
    }
  }
  for (const el of doc.querySelectorAll('[srcset]')) {
    const newValue = splitSrcset(el.getAttribute('srcset'))
      .map(entry => {
        const [url, ...descriptors] = entry.trim().split(/\s+/);
        const replacement = isInternal(url) ? replacements[refKey(url)] : null;
        return replacement ? [replacement, ...descriptors].join(' ') : entry.trim();
      })
      .join(', ');
    el.setAttribute('srcset', newValue);
  }
  for (const el of doc.querySelectorAll('[style]')) {
    el.setAttribute('style', replaceCSSPaths(el.getAttribute('style'), replacements));
  }
  for (const block of doc.getElementsByTagName('style')) {
    block.textContent = replaceCSSPaths(block.textContent || '', replacements);
  }
}

function replacementsFor(node, blobByCanonical) {
  const replacements = {};
  for (const ref of Object.keys(node.refToCanonical)) {
    const url = blobByCanonical[node.refToCanonical[ref]];
    if (url) {
      replacements[ref] = url;
    }
  }
  return replacements;
}

async function resolveResourceGraph(reader, rootNode, rootRefs) {
  const cssNodes = [];
  const blobByCanonical = {};
  const visited = new Set([rootNode.basePath]);
  let level = [{ node: rootNode, refs: rootRefs }];

  while (level.length) {
    const pending = new Set();
    for (const { node, refs } of level) {
      for (const ref of refs) {
        if (!isInternal(ref)) {
          continue;
        }
        const canonical = getAbsoluteFilePath(node.basePath, ref);
        if (!canonical) {
          continue;
        }
        node.refToCanonical[ref] = canonical;
        if (!visited.has(canonical)) {
          visited.add(canonical);
          pending.add(canonical);
        }
      }
    }
    if (!pending.size) {
      break;
    }

    const entries = await reader.getEntries([...pending]);
    level = [];
    for (const canonical of pending) {
      const fetched = entries.get(canonical);
      if (!fetched) {
        continue;
      }
      if (mimeEssence(fetched.mimetype) === CSS_MIMETYPE) {
        const content = decodeText(fetched.data, fetched.mimetype);
        const node = {
          basePath: canonical,
          canonical,
          content,
          refToCanonical: {},
        };
        cssNodes.push(node);
        level.push({ node, refs: getCSSPaths(content) });
      } else {
        blobByCanonical[canonical] = blobUrl(fetched.data, fetched.mimetype);
      }
    }
  }
  return { cssNodes, blobByCanonical };
}

function blobifyStylesheets(cssNodes, blobByCanonical) {
  for (let i = cssNodes.length - 1; i >= 0; i--) {
    const node = cssNodes[i];
    const rewritten = replaceCSSPaths(node.content, replacementsFor(node, blobByCanonical));
    blobByCanonical[node.canonical] = blobUrl(
      new TextEncoder().encode(rewritten),
      `${CSS_MIMETYPE}; charset=utf-8`,
    );
  }
}

export const EntryKinds = {
  HTML: 'html',
  NATIVE: 'native',
  FILE: 'file',
};

function matchesType(types, mimetype) {
  const family = mimetype.split('/')[0];
  return types.some(type => type === mimetype || type === `${family}/*`);
}

function revokeAll(urls) {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Show the entry in `iframe`, or return it for the host to render.
 * @param {object} reader - The ZimReader to fetch entries from
 * @param {string} entryPath - Path of the entry to load
 * @param {HTMLIFrameElement} iframe - The iframe to write the entry into
 * @param {object} [options] - How to treat native types and superseded loads
 * @param {Array<string>} [options.nativeTypes] - Mimetypes, or `family/*` patterns,
 * to return for the host to render rather than writing into the iframe
 * @param {Function} [options.isCurrent] - When it returns false, nothing is written
 * @returns {Promise<?{kind: string, basePath: string, objectUrls: Array<string>,
 * file: ?object}>} null if superseded. `basePath` is the post-redirect path. The caller
 * must revoke `objectUrls`. `file` is `{mimetype, data, name}` for NATIVE and
 * `{url, mimetype, name}` for FILE; for both the iframe is left as it was.
 */
export async function loadArticleIntoIframe(
  reader,
  entryPath,
  iframe,
  { nativeTypes = [], isCurrent = () => true } = {},
) {
  const entry = await reader.getEntry(entryPath);
  if (!entry.mimetype) {
    throw new Error('Entry has no MIME type');
  }
  const basePath = entry.path || entryPath;
  const essence = mimeEssence(entry.mimetype);
  if (!HTML_MIMETYPES.includes(essence)) {
    if (!isCurrent()) {
      return null;
    }
    const name = basePath.slice(basePath.lastIndexOf('/') + 1);
    if (matchesType(nativeTypes, essence)) {
      const file = { mimetype: essence, data: entry.data, name };
      return { kind: EntryKinds.NATIVE, basePath, objectUrls: [], file };
    }
    const url = blobUrl(entry.data, entry.mimetype);
    const file = { url, mimetype: entry.mimetype, name };
    return { kind: EntryKinds.FILE, basePath, objectUrls: [url], file };
  }

  const html = decodeText(entry.data, entry.mimetype);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const articleNode = { basePath, refToCanonical: {} };

  const { cssNodes, blobByCanonical } = await resolveResourceGraph(
    reader,
    articleNode,
    collectArticleRefs(doc),
  );
  blobifyStylesheets(cssNodes, blobByCanonical);
  const objectUrls = Object.values(blobByCanonical);
  if (!isCurrent()) {
    revokeAll(objectUrls);
    return null;
  }

  applyArticleRewrites(doc, replacementsFor(articleNode, blobByCanonical));
  iframe.srcdoc = doc.documentElement.outerHTML;
  return { kind: EntryKinds.HTML, basePath, objectUrls, file: null };
}
