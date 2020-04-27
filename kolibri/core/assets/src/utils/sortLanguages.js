/**
 * Sorts an Array of language objects by their `lang_name` property.
 * If currentLanguageId is truthy and is a language code that exists in
 * an element of availableLanguages, that element is always sorted first.
 *
 * @export
 * @param {Array} availableLanguages Array of language objects
 * @param {(String|null|undefined)} currentLanguageId Lang code for currently
 *  selected language
 * @returns {Array} Array of sorted language objects with the
 *  currently selected language object first, if one exists.
 */
export default function sortLanguages(availableLanguages, currentLanguageId) {
  const currentLanguageElem = availableLanguages.find(language => {
    return language.id == currentLanguageId;
  });

  let sortedLanguages = availableLanguages
    .sort(compareLanguages)
    .filter(language => language.id != currentLanguageId);

  if (currentLanguageElem) {
    sortedLanguages.unshift(currentLanguageElem);
  }

  return sortedLanguages;
}

export function compareLanguages(a, b) {
  if (a.lang_name.toLowerCase() < b.lang_name.toLowerCase()) {
    return -1;
  }
  if (b.lang_name.toLowerCase() < a.lang_name.toLowerCase()) {
    return 1;
  }
  return 0;
}
