import { createTranslator } from 'kolibri.utils.i18n';
import coreStrings from 'kolibri.utils.coreStrings';

export default function useKolibriPageTitle() {
  const kolibriStrings = createTranslator('kolibriStrings', {
    kolibriTitleMessage: {
      message: '{ title } - Kolibri',
      context: 'DO NOT TRANSLATE\nCopy the source string.',
    },
    errorPageTitle: {
      message: 'Error',
      context:
        "When Kolibri throws an error, this is the text that's used as the title of the error page. The description of the error follows below.",
    },
  });

  function getKolibriMetaInfo(pageTitle, error) {
    return {
      titleTemplate: title => {
        if (error) {
          return kolibriStrings.$tr('kolibriTitleMessage', {
            title: kolibriStrings.$tr('errorPageTitle'),
          });
        }
        if (!title) {
          // If no child component sets title, it reads 'Kolibri'
          return coreStrings('kolibriLabel');
        }
        // If child component sets title, it reads 'Child Title - Kolibri'
        return kolibriStrings.$tr('kolibriTitleMessage', { title });
      },
      title: pageTitle,
    };
  }

  return {
    getKolibriMetaInfo,
  };
}
