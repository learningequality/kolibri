import redirectBrowser from 'kolibri/utils/redirectBrowser';
import { availableLanguages, currentLanguage, sortLanguages } from 'kolibri/utils/i18n';
import { httpClient } from 'kolibri/client';
import urls from 'kolibri/urls';

export default {
  methods: {
    switchLanguage(code) {
      const url = urls['kolibri:core:set_language']();
      const data = { language: code, next: window.location.href };
      httpClient({
        method: 'POST',
        url,
        data,
      }).then(response => {
        // Endpoint returns a URL to redirect to.
        // Redirect to it.
        redirectBrowser(response.data);
      });
    },
  },
  computed: {
    languageOptions() {
      return sortLanguages(Object.values(availableLanguages), currentLanguage);
    },
  },
};
