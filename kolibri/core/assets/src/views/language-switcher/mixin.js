import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
import { httpClient } from 'kolibri.client';

export default {
  methods: {
    switchLanguage(code) {
      const path = this.Kolibri.urls['kolibri:set_language']();
      const entity = { language: code };
      httpClient({
        path,
        entity,
      }).then(() => {
        global.location.reload(true);
      });
    },
  },
  computed: {
    languageOptions() {
      return Object.keys(availableLanguages)
        .sort((a, b) => {
          if (a === currentLanguage) {
            return -1;
          }
          if (b === currentLanguage) {
            return 1;
          }
          if (a[0] < b[0]) {
            return -1;
          }
          if (b[0] < a[0]) {
            return 1;
          }
          return 0;
        })
        .map(key => availableLanguages[key]);
    },
  },
};
