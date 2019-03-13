import filesize from 'filesize';
import findKey from 'lodash/findKey';
import { createTranslator } from 'kolibri.utils.i18n';

// Strings are the _READABLE strings in le_utils.constants.format_presets
const filePresetStrings = {
  highResolutionVideo: 'High Resolution ({fileSize})',
  lowResolutionVideo: 'Low Resolution ({fileSize})',
  vectorizedVideo: 'Vectorized ({fileSize})',
  // Same 'thumbnail' string is used for video, audio, document, exercise, and topic
  thumbnail: 'Thumbnail ({fileSize})',
  videoSubtitle: 'Subtitle ({fileSize})',
  audio: 'Audio ({fileSize})',
  document: 'Document ({fileSize})',
  exercise: 'Exercise ({fileSize})',
  exerciseImage: 'Exercise Image ({fileSize})',
  exerciseGraphie: 'Exercise Graphie ({fileSize})',
  channelThumbnail: 'Channel Thumbnail ({fileSize})',
  html5Zip: 'HTML5 Zip ({fileSize})',
  html5Thumbnail: 'HTML5 Thumbnail ({fileSize})',
};

const filePresetTranslator = createTranslator('FilePresetStrings', filePresetStrings);

// 'file.preset' is an enum equal to the values in the filePresetStrings map, so this function
// searches on the values in filePresetStrings, then uses the matching key on filePreset
// translator to return the localized string.
export function getFilePresetString(file) {
  const { preset, file_size } = file;
  const trKey = findKey(filePresetStrings, x => x.startsWith(preset));
  if (trKey) {
    return filePresetTranslator.$tr(trKey, { fileSize: filesize(file_size) });
  }
  return '';
}
