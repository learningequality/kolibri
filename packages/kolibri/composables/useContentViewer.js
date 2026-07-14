import { computed, inject } from 'vue';
import { get } from '@vueuse/core';
import logger from 'kolibri-logging';
import { ContentErrorConstants } from 'kolibri/constants';
import { getContentLangDir, languageDirections } from 'kolibri/utils/i18n';
import { getRenderableFiles, getDefaultFile } from '../components/internal/ContentViewer/utils';
import { CONTENT_VIEWER_CONTEXT_KEY } from '../components/internal/ContentViewer';

const logging = logger.getLogger(__filename);

/**
 * @typedef {import('vue').ComputedRef} Ref
 */

/**
 * @typedef {object} ContentViewerApi
 * @property {Ref<Array>} files - All available files for this content
 * @property {Ref<object|null>} defaultFile - Primary file selected for viewing
 * @property {Ref<Array>} supplementaryFiles - Subtitle and transcript files
 * @property {Ref<Array>} thumbnailFiles - Thumbnail and poster image files
 * @property {Ref<object>} options - Content-specific rendering configuration
 * @property {Ref<object>} lang - Language metadata for the content
 * @property {Ref<number|null>} duration - Content duration in seconds
 * @property {Ref<boolean>} forceDurationBasedProgress - Forces progress to track elapsed time
 * @property {Ref<number|null>} durationBasedProgress - Progress from time spent over duration
 * @property {Ref<string>} contentDirection - Text direction, 'ltr' or 'rtl'
 * @property {Ref<boolean>} contentIsRtl - True when content reads right-to-left
 * @property {Function} reportError - Emit an error to the parent ContentViewer
 * @property {Function} reportLoadingError - Emit a content-loading error
 * @property {Ref} itemData - Raw assessment item payload
 * @property {Ref<string>} itemId - Identifier of the current assessment item
 * @property {Ref<object>} answerState - Saved learner responses
 * @property {Ref<boolean>} interactive - Allows learner interaction when true
 * @property {Ref<boolean>} showCorrectAnswer - Reveals correct answers when true
 * @property {Ref<boolean>} allowHints - Permits taking hints when true
 * @property {Ref<object>} extraFields - Additional persisted metadata fields
 * @property {Ref<string>} userId - Id of the interacting or reviewed user
 * @property {Ref<string>} userFullName - Full name of the interacting or reviewed user
 * @property {Ref<number>} timeSpent - Seconds spent on this content
 * @property {Ref<number>} progress - Completion fraction from 0 to 1
 */

/**
 * Composable for content viewer components.
 *
 * This composable provides access to content viewer state and utilities for
 * viewer components that are rendered within a ContentViewer wrapper.
 *
 * The ContentViewer wrapper component is responsible for:
 * - Resolving the appropriate viewer component based on content type
 * - Extracting files from either contentNode props or DOM elements
 * - Providing a unified context to all descendant viewer components
 * @param {object} context - The Vue component context object
 * @param {Function} context.emit - The component's emit function for emitting events
 * @param {object} [options={}] - Configuration options
 * @param {Ref|number|null} [options.defaultDuration=null] - Default duration for
 * duration-based progress calculation. Can be a Vue ref or a static number. Used when the
 * content doesn't have an explicit duration set.
 * @param {{[key: string]: Function}} [options.customExtractors={}] - Custom file extractors
 * for DOM-based viewing. These extractors are called when the ContentViewer receives
 * a DOM node prop instead of files.
 * The object keys are CSS selectors, and the values are extractor functions.
 * When the ContentViewer has a node prop that matches a selector, the
 * corresponding extractor function is called to extract file objects from the element.
 * @returns {ContentViewerApi} Content viewer state and utilities
 * @throws {Error} If called outside of a ContentViewer component hierarchy
 * @example
 * // Custom extractors for video and audio elements
 * const customExtractors = {
 *   'video': (element) => {
 *     const files = [];
 *     if (element.src) {
 *       files.push({
 *         storage_url: element.src,
 *         preset: 'high_res_video',
 *         available: true,
 *         supplementary: false,
 *         thumbnail: false,
 *       });
 *     }
 *     // Extract from <source> children
 *     for (const source of element.querySelectorAll('source')) {
 *       files.push({
 *         storage_url: source.src,
 *         preset: 'high_res_video',
 *         available: true,
 *       });
 *     }
 *     return files;
 *   },
 *   'audio': (element) => {
 *     // Similar extraction for audio elements
 *     return [{ storage_url: element.src, preset: 'audio', available: true }];
 *   },
 * };
 * // Usage in a viewer component's setup function
 * setup(props, context) {
 *   const { files, defaultFile } = useContentViewer(context, {
 *     customExtractors,
 *     defaultDuration: 300, // 5 minutes
 *   });
 *   // ...
 * }
 * @example
 * // Basic usage in a viewer component
 * import useContentViewer from 'kolibri/composables/useContentViewer';
 *
 * export default {
 *   name: 'MyViewer',
 *   setup(props, context) {
 *     const {
 *       defaultFile,
 *       files,
 *       reportLoadingError,
 *       contentDirection,
 *     } = useContentViewer(context);
 *
 *     return {
 *       defaultFile,
 *       files,
 *       reportLoadingError,
 *       contentDirection,
 *     };
 *   },
 * };
 */
export default function useContentViewer(
  { emit },
  { defaultDuration = null, customExtractors = {} } = {},
) {
  // Inject props from ContentViewer
  const injectedContext = inject(CONTENT_VIEWER_CONTEXT_KEY);

  if (!injectedContext) {
    throw new Error(
      'useContentViewer must be called within a component that is a descendant of ContentViewer',
    );
  }

  const {
    files,
    itemData,
    itemId,
    answerState,
    showCorrectAnswer,
    interactive,
    lang,
    options,
    extraFields,
    userId,
    allowHints,
    timeSpent,
    duration,
    userFullName,
    progress,
    embedded,
    setCustomExtractors,
  } = injectedContext;

  setCustomExtractors(customExtractors);

  const forceDurationBasedProgress = computed(() => {
    return options.value.force_duration_based_progress || false;
  });

  const durationBasedProgress = computed(() => {
    const dur = duration.value || get(defaultDuration);
    if (!dur) {
      return null;
    }
    return timeSpent.value / dur;
  });

  const defaultFile = computed(() => {
    return getDefaultFile(getRenderableFiles(files.value));
  });

  const supplementaryFiles = computed(() => {
    return files.value.filter(file => file.supplementary && file.available);
  });

  const thumbnailFiles = computed(() => {
    return files.value.filter(file => file.thumbnail && file.available);
  });

  const contentDirection = computed(() => {
    return getContentLangDir(lang.value);
  });

  const contentIsRtl = computed(() => {
    return contentDirection.value === languageDirections.RTL;
  });

  const availableHints = computed(() => {
    return 0;
  });

  const totalHints = computed(() => {
    return 0;
  });

  // Methods
  const checkAnswer = () => {
    logging.warn('This content viewer has not implemented the checkAnswer method');
    return null;
  };

  const takeHint = () => {
    logging.warn('This content viewer has not implemented the takeHint method');
    return null;
  };

  const reportError = error => {
    emit('error', error);
  };

  const reportLoadingError = error => {
    reportError({
      message: error,
      error: ContentErrorConstants.LOADING_ERROR,
    });
  };

  return {
    files,
    options,
    lang,
    duration,
    forceDurationBasedProgress,
    durationBasedProgress,
    defaultFile,
    supplementaryFiles,
    thumbnailFiles,
    contentDirection,
    contentIsRtl,
    availableHints,
    totalHints,
    checkAnswer,
    takeHint,
    reportLoadingError,
    reportError,
    itemData,
    itemId,
    answerState,
    allowHints,
    extraFields,
    interactive,
    showCorrectAnswer,
    timeSpent,
    userId,
    userFullName,
    progress,
    embedded,
  };
}
