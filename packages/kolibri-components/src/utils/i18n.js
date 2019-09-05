export const languageDirections = {
  LTR: 'ltr',
  RTL: 'rtl',
};

export const defaultLanguage = {
  id: 'en',
  lang_name: 'English',
  lang_direction: languageDirections.LTR,
};

export const languageValidator = language => {
  return ['id', 'lang_name', 'lang_direction'].reduce((valid, key) => valid && language[key], true);
};

export const getContentLangDir = language => {
  return (language || {}).lang_direction || languageDirections.LTR;
};
