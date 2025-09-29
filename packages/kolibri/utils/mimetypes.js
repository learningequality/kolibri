/**
 * Utility functions for mapping MIME types to content presets.
 *
 * These mappings are used when handling DOM elements (like <object> tags)
 * that specify content by MIME type rather than Kolibri's preset system.
 *
 * The mappings should stay in sync with the presets defined in le_utils
 * and the file formats registered in the content viewer hooks.
 */

/**
 * Map of MIME types to their corresponding Kolibri content presets.
 * This is used when rendering embedded content specified via object tags
 * or other DOM elements that use MIME types.
 */
const MIMETYPE_TO_PRESET_MAP = {
  // Video formats
  'video/mp4': 'high_res_video',
  'video/webm': 'high_res_video',
  'video/ogg': 'high_res_video',

  // Audio formats
  'audio/mp3': 'audio',
  'audio/mpeg': 'audio',
  'audio/ogg': 'audio',

  // Document formats
  'application/pdf': 'document',

  // HTML5/Zip content
  'application/epub+zip': 'epub',
  'application/bloompub+zip': 'bloompub',
  'application/kpub+zip': 'kpub',
  'application/perseus+zip': 'exercise',
  'application/zip': 'html5_zip',
  'application/x-zip-compressed': 'html5_zip',
  'application/vnd.h5p': 'h5p',
  'application/h5p+zip': 'h5p',
};

/**
 * Default preset to use when a MIME type is not recognized.
 */
const DEFAULT_PRESET = 'document';

/**
 * Infer content preset from a MIME type.
 *
 * This is primarily used when handling embedded content specified via
 * <object type="..."> tags or similar DOM elements where content is
 * identified by MIME type rather than Kolibri's preset system.
 * @param {string} mimetype - The MIME type to look up
 * @returns {string} The corresponding content preset, or 'document' as fallback
 * @example
 * // Returns 'high_res_video'
 * inferPresetFromMimetype('video/mp4');
 * @example
 * // Returns 'document' (default fallback)
 * inferPresetFromMimetype('application/unknown');
 */
export function inferPresetFromMimetype(mimetype) {
  return MIMETYPE_TO_PRESET_MAP[mimetype] || DEFAULT_PRESET;
}

/**
 * Check if a MIME type has a known preset mapping.
 * @param {string} mimetype - The MIME type to check
 * @returns {boolean} True if the MIME type has a known preset
 */
export function hasPresetForMimetype(mimetype) {
  return mimetype in MIMETYPE_TO_PRESET_MAP;
}

/**
 * Get all registered MIME types.
 * @returns {string[]} Array of all registered MIME types
 */
export function getRegisteredMimetypes() {
  return Object.keys(MIMETYPE_TO_PRESET_MAP);
}

export default {
  inferPresetFromMimetype,
  hasPresetForMimetype,
  getRegisteredMimetypes,
};
