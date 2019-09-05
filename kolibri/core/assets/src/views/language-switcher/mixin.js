import { redirectBrowser } from 'kolibri.utils.browser';
import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
import { httpClient } from 'kolibri.client';
import urls from 'kolibri.urls';

export default {
  methods: {
    switchLanguage(code) {
      const path = urls['kolibri:core:set_language']();
      const entity = { language: code, next: window.location.href };
      httpClient({
        method: 'POST',
        path,
        entity,
      }).then(response => {
        // Endpoint returns a URL to redirect to.
        // Redirect to it.
        redirectBrowser(response.entity);
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
