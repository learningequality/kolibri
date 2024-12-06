import Vue from 'vue';
import logger from 'kolibri-logging';
import heartbeat from 'kolibri/heartbeat';
import { ContentErrorConstants } from 'kolibri/constants';
import {
  defaultLanguage,
  languageValidator,
  getContentLangDir,
  languageDirections,
} from 'kolibri/utils/i18n';
import { getRenderableFiles, getDefaultFile } from './utils';
import ContentRendererError from './ContentRendererError';

const logging = logger.getLogger(__filename);

const ContentRendererErrorComponent = Vue.extend(ContentRendererError);

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

const fileFieldMap = {
  storage_url: {
    type: String,
  },
  id: {
    type: String,
  },
  priority: {
    type: Number,
  },
  available: {
    type: Boolean,
  },
  file_size: {
    type: Number,
  },
  checksum: {
    type: String,
  },
  extension: {
    type: String,
  },
  preset: {
    type: String,
  },
  lang: {
    type: Object,
    validator: lang => lang === null || languageValidator(lang),
  },
  supplementary: {
    type: Boolean,
  },
  thumbnail: {
    type: Boolean,
  },
};

function fileValidator(file) {
  let result = true;
  for (const key in fileFieldMap) {
    const val =
      typeof file[key] !== 'undefined' &&
      typeof file[key] === typeof fileFieldMap[key].type() &&
      (fileFieldMap[key].validator ? fileFieldMap[key].validator(file[key]) : true);
    if (!val) {
      logging.error(`Validation failed for '${key}' in `, file);
      result = false;
    }
  }
  return result;
}

function multipleFileValidator(files) {
  return files.reduce((acc, file) => acc && fileValidator(file), true);
}

export default {
  props: {
    files: {
      type: Array,
      default: () => [],
      validator: multipleFileValidator,
    },
    file: {
      type: Object,
      default: null,
      validator: fileValidator,
    },
    // As an alternative to passing a file object to set the state of the
    // content renderer, can also pass raw itemData (which will be parsed by
    // the renderer if there are no files or file object).
    // The type could depend on the renderer, so we enforce nothing here
    // except a null default.
    itemData: {
      default: null,
    },
    // If just itemData is passed, we have no mechanism for knowing the preset
    // of the data, and hence which renderer to choose. If itemData is utilized
    // the preset must be explicitly set.
    preset: {
      default: null,
      type: String,
    },
    itemId: {
      type: String,
    },
    answerState: {
      type: Object,
      default: () => ({}),
    },
    allowHints: {
      type: Boolean,
      default: true,
    },
    extraFields: {
      type: Object,
      default: () => ({}),
    },
    options: {
      type: Object,
      default: () => ({}),
    },
    // Allow content renderers to display in a static mode
    // where user interaction is not allowed
    interactive: {
      type: Boolean,
      default: true,
    },
    lang: {
      type: Object,
      default: () => defaultLanguage,
      validator: languageValidator,
    },
    showCorrectAnswer: {
      type: Boolean,
      default: false,
    },
    timeSpent: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      default: null,
    },
  },
  data() {
    return { _resourceError: null };
  },
  created() {
    this.$on(interactionEvents, heartbeat.setUserActive);
    this.$on('error', this._reportError);
  },
  computed: {
    // For when we want to force a renderer to use time-based progress (e.g. instead of % completed)
    forceDurationBasedProgress() {
      return this.options.force_duration_based_progress || false;
    },
    // Uses clock-time to track time so that all content types can be tracked the same way
    durationBasedProgress() {
      const duration = this.duration || this.defaultDuration;
      if (!duration) {
        return null;
      }
      return this.timeSpent / duration;
    },
    defaultFile() {
      return getDefaultFile(getRenderableFiles(this.files));
    },
    supplementaryFiles() {
      return this.files.filter(file => file.supplementary && file.available);
    },
    thumbnailFiles() {
      return this.files.filter(file => file.thumbnail && file.available);
    },
    contentDirection() {
      return getContentLangDir(this.lang);
    },
    contentIsRtl() {
      return this.contentDirection === languageDirections.RTL;
    },
    availableHints() {
      return 0;
    },
    totalHints() {
      return 0;
    },
  },
  methods: {
    /**
     * @public
     */
    checkAnswer() {
      logging.warn('This content renderer has not implemented the checkAnswer method');
      return null;
    },
    /**
     * @public
     */
    takeHint() {
      logging.warn('This content renderer has not implemented the takeHint method');
      return null;
    },
    _reportError(error) {
      this._resourceError = error;
      if (!this._errorComponent) {
        const domNode = document.createElement('div');
        this.$el.prepend(domNode);
        this._errorComponent = new ContentRendererErrorComponent({
          el: domNode,
          parent: this,
          propsData: { error: this._resourceError, files: this.files },
        });
      }
    },
    /**
     * @public
     */
    reportLoadingError(error) {
      this.$emit('error', {
        message: error,
        error: ContentErrorConstants.LOADING_ERROR,
      });
    },
  },
};
