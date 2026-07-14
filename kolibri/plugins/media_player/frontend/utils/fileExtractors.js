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

/**
 * Extract files from media elements (video/audio)
 * @param {HTMLMediaElement} element - Source for file extraction
 * @returns {Array} Array of file objects
 */
function extractMediaFiles(element) {
  const files = [];
  const preset = element.tagName.toLowerCase() === 'video' ? 'high_res_video' : 'audio';
  let sourceCount = 0;

  // Direct src attribute
  if (element.src) {
    files.push(_generateFileData(element.src, preset, { priority: 1 }));
    sourceCount++;
  }

  // <source> and <track> children
  for (const child of element.children) {
    const childTag = child.tagName.toLowerCase();
    const childSrc = child.getAttribute('src');

    if (childTag === 'source' && child.src) {
      files.push(_generateFileData(child.src, preset, { priority: sourceCount + 1 }));
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
