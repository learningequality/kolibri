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
    compareLanguages(a, b) {
      if (a.id === currentLanguage) {
        return -1;
      }
      if (b.id === currentLanguage) {
        return 1;
      }
      if (a.lang_name.toLowerCase() < b.lang_name.toLowerCase()) {
        return -1;
      }
      if (b.lang_name.toLowerCase() < a.lang_name.toLowerCase()) {
        return 1;
      }
      return 0;
    },
  },
  computed: {
    languageOptions() {
      return Object.values(availableLanguages).sort(this.compareLanguages);
    },
  },
};
