import { defaultLanguage, languageValidator, getContentLangDir } from '../utils/i18n';

const interactionEvents = [
  'answerGiven',
  'hintTaken',
  'itemError',
  'interaction',
  'updateProgress',
  'updateContentState',
  'startTracking',
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
  download_url: {
    type: String,
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
      console.error(`Validation failed for '${key}' in `, file); // eslint-disable-line no-console
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
  },
  computed: {
    defaultItemPreset() {
      return this.defaultFile
        ? this.defaultFile.preset
        : this.canRenderContent(this.preset)
        ? this.preset
        : null;
    },
    availableFiles() {
      return this.files.filter(
        file =>
          !file.thumbnail &&
          !file.supplementary &&
          file.available &&
          this.canRenderContent(file.preset)
      );
    },
    defaultFile() {
      return (
        this.file ||
        (this.availableFiles && this.availableFiles.length ? this.availableFiles[0] : undefined)
      );
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
      return this.contentDirection === 'rtl';
    },
  },
  interactionEvents,
};
