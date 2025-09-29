import { h, ref, onErrorCaptured, provide, computed } from 'vue';
import heartbeat from 'kolibri/heartbeat';
import kolibri from 'kolibri';
import { defaultLanguage } from 'kolibri/utils/i18n';
import { MasteryModelTypes } from 'kolibri/constants';
import { inferPresetFromMimetype } from 'kolibri/utils/mimetypes';
import { validateObject } from 'kolibri/utils/objectSpecs';
import { getRenderableFiles, getDefaultFile, getFilePreset } from './utils';
import ContentViewerError from './ContentViewerError';

export const CONTENT_VIEWER_CONTEXT_KEY = Symbol('contentViewerContext');

// Module-level counter for unique viewer IDs
let viewerIdCounter = 0;

const langSpec = {
  id: { type: String, required: true },
  lang_name: { type: String, required: true },
  lang_direction: { type: String, required: true },
};

const fileSpec = {
  id: { type: String, required: true },
  storage_url: { type: String, required: true },
  extension: { type: String, required: true },
  available: { type: Boolean, required: true },
  file_size: { type: Number, required: true },
  checksum: { type: String, required: true },
  preset: { type: String, required: true },
  lang: {
    type: Object,
    default: null,
    spec: langSpec,
  },
  supplementary: { type: Boolean, required: true },
  thumbnail: { type: Boolean, required: true },
};

const masteryModelTypes = Object.values(MasteryModelTypes);

const masteryModelSpec = {
  type: {
    type: String,
    required: true,
    validator: value => masteryModelTypes.includes(value),
  },
  // Carried only for the 'm_of_n' type: m correct of the last n
  m: { type: Number, default: null },
  n: { type: Number, default: null },
};

const assessmentMetadataSpec = {
  // Question ids the assessment can present
  assessment_item_ids: {
    type: Array,
    required: true,
    spec: { type: String, required: true },
  },
  number_of_assessments: { type: Number, required: true },
  mastery_model: {
    type: Object,
    required: true,
    spec: masteryModelSpec,
  },
  randomize: { type: Boolean, required: true },
  is_manipulable: { type: Boolean, required: true },
};

const contentNodeSpec = {
  files: {
    type: Array,
    required: true,
    spec: {
      type: Object,
      required: true,
      spec: fileSpec,
    },
  },
  lang: {
    type: Object,
    default: null,
    spec: langSpec,
  },
  options: {
    type: Object,
    default: () => ({}),
  },
  duration: {
    type: Number,
    default: null,
  },
  assessmentmetadata: {
    type: Object,
    default: null,
    spec: assessmentMetadataSpec,
  },
};

const interactionEvents = [
  'answerGiven',
  'hintTaken',
  'itemError',
  'interaction',
  'addProgress',
  'updateProgress',
  'updateContentState',
  'startTracking',
  'navigateTo',
  'finished',
];

/**
 * Combines event listeners and appends a viewerId to all event arguments.
 * This allows parent components to track which ContentViewer emitted the event.
 * @param {Function|Array|undefined} existing - Existing listener(s) from context
 * @param {Function} heartbeatListener - The heartbeat.setUserActive listener
 * @param {string} viewerId - Unique identifier for this ContentViewer instance
 * @returns {Function} Combined listener that calls heartbeat and existing listeners with viewerId
 */
function combineEventListenersWithViewerId(existing, heartbeatListener, viewerId) {
  return (...args) => {
    // Always call heartbeat
    heartbeatListener();

    // Call existing listeners with viewerId appended to args
    if (existing) {
      if (Array.isArray(existing)) {
        existing.forEach(fn => fn(...args, viewerId));
      } else {
        existing(...args, viewerId);
      }
    }
  };
}

function getComponent(element, defaultItemPreset) {
  const domComponent = kolibri.elementViewerComponent(element);
  if (domComponent) {
    return domComponent;
  }

  if (defaultItemPreset) {
    return kolibri.presetViewerComponent(defaultItemPreset);
  }

  return null;
}

export default {
  name: 'ContentViewer',
  props: {
    // -- Content structure --
    // What content to render and how to resolve the viewer component.
    contentNode: {
      type: Object,
      default: null,
      validator: contentNode => validateObject(contentNode, contentNodeSpec),
    },
    element: {
      type: HTMLElement,
      default: null,
    },
    itemData: {
      default: null,
    },
    preset: {
      default: null,
      type: String,
    },

    // -- Session state --
    // Progress tracking state, relayed from the caller's useProgressTracking composable.
    progress: {
      type: Number,
      default: 0,
    },
    timeSpent: {
      type: Number,
      default: 0,
    },
    extraFields: {
      type: Object,
      default: () => ({}),
    },
    answerState: {
      type: Object,
      default: () => ({}),
    },

    // -- User data --
    // Identifies the user interacting with or being reviewed for this content.
    // Not necessarily the logged-in user (e.g. coach reviewing a learner's work).
    userId: {
      type: String,
      default: '',
    },
    userFullName: {
      type: String,
      default: '',
    },

    // -- Rendering context --
    // Per-call-site configuration that controls how the viewer behaves.
    itemId: {
      type: String,
    },
    interactive: {
      type: Boolean,
      default: true,
    },
    showCorrectAnswer: {
      type: Boolean,
      default: false,
    },
    allowHints: {
      type: Boolean,
      default: true,
    },
    embedded: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, context) {
    const error = ref(null);

    // Generate unique viewer ID for this instance
    const viewerId = `content-viewer-${++viewerIdCounter}`;

    const _customExtractors = ref(null);

    // Computed values that combine multiple prop sources
    const files = computed(() => {
      if (props.element && kolibri.canHandleElement(props.element)) {
        // Check for custom extractors first (keyed by CSS selector)
        for (const [selector, extractor] of Object.entries(_customExtractors.value || {})) {
          if (props.element.matches(selector)) {
            const extractedFiles = extractor(props.element);
            if (extractedFiles && extractedFiles.length > 0) {
              return extractedFiles;
            }
          }
        }

        // Default handling for <object> elements
        if (props.element.matches('object[data][type]')) {
          const mimeType = props.element.getAttribute('type');
          return [
            {
              storage_url: props.element.getAttribute('data'),
              preset: inferPresetFromMimetype(mimeType),
              available: true,
              supplementary: false,
              thumbnail: false,
              priority: 1,
            },
          ];
        }
      }
      // Otherwise use the content node files
      return props.contentNode?.files || [];
    });

    const defaultFile = computed(() => {
      return getDefaultFile(getRenderableFiles(files.value));
    });

    const defaultItemPreset = computed(() =>
      getFilePreset(getDefaultFile(getRenderableFiles(files.value)), props.preset),
    );

    const options = computed(() => {
      return props.contentNode?.options || {};
    });

    const lang = computed(() => {
      return props.contentNode?.lang || defaultLanguage;
    });

    const duration = computed(() => {
      return props.contentNode?.duration || null;
    });

    function setCustomExtractors(extractors) {
      _customExtractors.value = extractors;
    }

    // Provide props context to descendant components via useContentViewer
    const contentViewerContext = {
      contentNode: computed(() => props.contentNode),
      element: computed(() => props.element),
      files,
      defaultFile,
      itemData: computed(() => props.itemData),
      itemId: computed(() => props.itemId),
      answerState: computed(() => props.answerState),
      showCorrectAnswer: computed(() => props.showCorrectAnswer),
      interactive: computed(() => props.interactive),
      lang,
      options,
      extraFields: computed(() => props.extraFields),
      userId: computed(() => props.userId),
      allowHints: computed(() => props.allowHints),
      timeSpent: computed(() => props.timeSpent),
      duration,
      userFullName: computed(() => props.userFullName),
      progress: computed(() => props.progress),
      embedded: computed(() => props.embedded),
      setCustomExtractors,
    };

    provide(CONTENT_VIEWER_CONTEXT_KEY, contentViewerContext);

    onErrorCaptured(err => {
      // Error boundary - catches uncaught errors from child renderer components
      error.value = err;
      context.emit('error', err);
    });

    return () => {
      const component = getComponent(props.element, defaultItemPreset.value);
      // If we caught an error, show error component
      if (error.value || !component) {
        return h(ContentViewerError, {
          props: {
            error: error.value
              ? error.value
              : new Error('No compatible viewer found for this content.'),
            files: files.value,
          },
        });
      }

      const combinedListeners = {
        ...context.listeners,
      };
      for (const event of interactionEvents) {
        combinedListeners[event] = combineEventListenersWithViewerId(
          combinedListeners[event],
          heartbeat.setUserActive,
          viewerId,
        );
      }
      return h(
        component,
        {
          on: combinedListeners,
        },
        context.slots.default,
      );
    };
  },
};
