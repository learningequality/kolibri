import { defaultLanguage, languageValidator } from 'kolibri.utils.i18n';

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

const fileValidator = file => {
  // Do this as a reduce, as any failure will short cut any other computation
  return Object.keys(fileFieldMap).reduce(
    (acc, key) =>
      acc &&
      typeof file[key] !== undefined &&
      typeof file[key] === typeof fileFieldMap[key].type() &&
      (fileFieldMap[key].validator ? fileFieldMap[key].validator(file[key]) : true),
    true
  );
};

const multipleFileValidator = files => {
  return files.reduce((acc, file) => acc && fileValidator(file), true);
};

export default {
  props: {
    files: {
      type: Array,
      required: true,
      validator: multipleFileValidator,
    },
    defaultFile: {
      type: Object,
      required: true,
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
    supplementaryFiles: {
      type: Array,
      validator: multipleFileValidator,
    },
    thumbnailFiles: {
      type: Array,
      validator: multipleFileValidator,
    },
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
};
