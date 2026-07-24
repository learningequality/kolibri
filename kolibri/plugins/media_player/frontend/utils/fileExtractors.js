/**
 * File extractor functions for media elements (video/audio)
 */

// Content presets that route to the video player (vs. the audio player).
export const VIDEO_PRESETS = new Set(['high_res_video', 'low_res_video']);

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
 * Derive a file extension from a URL's path suffix, ignoring query/hash.
 * @param {string} url - The file's URL (absolute or relative)
 * @returns {string|null} lowercased extension, or null if none is present
 */
function _extensionFromUrl(url) {
  const path = url.split(/[?#]/)[0];
  const lastSegment = path.split('/').pop();
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === lastSegment.length - 1) {
    return null;
  }
  return lastSegment.slice(dotIndex + 1).toLowerCase();
}

/**
 * Extract files from media elements (video/audio)
 * @param {HTMLMediaElement} element - Source for file extraction
 * @returns {Array} Array of file objects
 */
function extractMediaFiles(element) {
  const files = [];
  const isVideo = element.tagName.toLowerCase() === 'video';
  const preset = isVideo ? 'high_res_video' : 'audio';
  // The container's typical extension, used when neither the type nor the URL
  // suffix yields one.
  const defaultExtension = isVideo ? 'mp4' : 'mp3';
  let sourceCount = 0;

  // Use getAttribute to read raw attribute values, since .src resolves
  // against the document base URL which is unavailable on detached nodes.
  const src = element.getAttribute('src');
  if (src) {
    // Prefer the URL suffix; fall back to the container's typical extension.
    const extension = _extensionFromUrl(src) || defaultExtension;
    files.push(_generateFileData(src, preset, { extension, priority: 1 }));
    sourceCount++;
  }

  // <source> and <track> children
  for (const child of element.children) {
    const childTag = child.tagName.toLowerCase();
    const childSrc = child.getAttribute('src');

    if (childTag === 'source' && childSrc) {
      // Map the MIME type first; fall back to the URL suffix for types the map
      // doesn't cover (e.g. video/ogg) or when type is absent, then to the
      // container default so the source type never becomes video/null.
      const extension =
        (child.type && mimeTypeToExtensionMap[child.type]) ||
        _extensionFromUrl(childSrc) ||
        defaultExtension;
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
