import { defaultLanguage, languageValidator, getContentLangDir } from 'kolibri.utils.i18n';
import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

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
      required: true,
      validator: multipleFileValidator,
    },
    file: {
      type: Object,
      default: null,
      validator: fileValidator,
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
      default: () => {},
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
    available() {
      return this.defaultFile ? this.defaultFile.available : false;
    },
    preset() {
      return this.defaultFile ? this.defaultFile.preset : undefined;
    },
    availableFiles() {
      return this.files.filter(
        file =>
          !file.thumbnail &&
          !file.supplementary &&
          file.available &&
          this.Kolibri.canRenderContent(file.preset)
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
};
