import { createTranslator } from 'kolibri.utils.i18n';
import bytesForHumans from 'kolibri.utils.bytesForHumans';
import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

// Strings are the _READABLE strings in le_utils.constants.format_presets,
// with ' ({fileSize})' appended.
// NOTE: Strings for 'Exercise Image', 'Exercise Graphie', and 'Channel Thumbnail'
// are excluded, as they are not downloadable in Kolibri.
const filePresetStrings = {
  high_res_video: 'High Resolution ({fileSize})',
  low_res_video: 'Low Resolution ({fileSize})',
  vector_video: 'Vectorized ({fileSize})',
  // Same 'thumbnail' string is used for video, audio, document, exercise, and topic
  thumbnail: 'Thumbnail ({fileSize})',
  video_subtitle: 'Subtitles - {langCode} ({fileSize})',
  audio: 'Audio ({fileSize})',
  document: 'Document ({fileSize})',
  exercise: 'Exercise ({fileSize})',
  html5_zip: 'HTML5 Zip ({fileSize})',
  epub: 'ePub Document ({fileSize})',
  slideshow_manifest: 'Slideshow ({fileSize})',
  slideshow_image: 'Slideshow image ({fileSize})',
};

const filePresetTranslator = createTranslator('FilePresetStrings', filePresetStrings);

// 'file.preset' is an enum equal to the values in the filePresetStrings map, so this function
// searches on the values in filePresetStrings, then uses the matching key on filePreset
// translator to return the localized string.
export function getFilePresetString(file) {
  const { preset, file_size } = file;
  const params = {
    fileSize: bytesForHumans(file_size),
  };
  if (preset === 'video_subtitle') {
    params.langCode = file.lang.lang_code;
  }
  if (preset.endsWith('thumbnail')) {
    return filePresetTranslator.$tr('thumbnail', params);
  }
  if (filePresetStrings[preset]) {
    return filePresetTranslator.$tr(preset, params);
  }
  logging.error(`Download translation string not defined for '${preset}'`);
  return preset;
}
