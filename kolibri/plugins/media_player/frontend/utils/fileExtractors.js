/**
 * File extractor functions for media elements (video/audio)
 */

/**
 * Generate file data object for media files
 * @param {string} url - The file's storage URL
 * @param {string} preset - Content preset
 * @param {object} options - Additional file options
 * @returns {object} File data object
 */
function _generateFileData(url, preset, options = {}) {
  return {
    storage_url: url,
    preset,
    available: true,
    supplementary: false,
    thumbnail: false,
    priority: 1,
    ...options,
  };
}

const mimeTypeToExtensionMap = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
};

/**
 * Extract files from media elements (video/audio)
 * @param {HTMLMediaElement} element - Source for file extraction
 * @returns {Array} Array of file objects
 */
function extractMediaFiles(element) {
  const files = [];
  const preset = element.tagName.toLowerCase() === 'video' ? 'high_res_video' : 'audio';
  let sourceCount = 0;

  // Use getAttribute to read raw attribute values, since .src resolves
  // against the document base URL which is unavailable on detached nodes.
  const src = element.getAttribute('src');
  if (src) {
    const extension = element.tagName.toLowerCase() === 'video' ? 'mp4' : 'mp3';
    files.push(_generateFileData(src, preset, { extension, priority: 1 }));
    sourceCount++;
  }

  // <source> and <track> children
  for (const child of element.children) {
    const childTag = child.tagName?.toLowerCase();
    const childSrc = child.getAttribute('src');

    if (childTag === 'source' && childSrc) {
      const extension = child.type ? mimeTypeToExtensionMap[child.type] : null;
      files.push(_generateFileData(childSrc, preset, { extension, priority: sourceCount + 1 }));
      sourceCount++;
    } else if (childTag === 'track' && childSrc && !['metadata', 'chapters'].includes(child.kind)) {
      files.push(
        _generateFileData(childSrc, 'video_subtitle', {
          supplementary: true,
          lang: child.srclang,
        }),
      );
    }
  }

  return files;
}

/**
 * Media extractors for use with useContentViewer
 */
export default {
  video: extractMediaFiles,
  audio: extractMediaFiles,
};
