import orderBy from 'lodash/orderBy';
import { getContentLangActive } from 'kolibri/utils/i18n';

export function sortChannels(channels, primaryLanguage) {
  return orderBy(
    channels,
    [
      c => getContentLangActive(c.lang || c.lang_code, primaryLanguage),
      c => Math.max(...c.included_languages.map(l => getContentLangActive(l, primaryLanguage))),
    ],
    ['desc', 'desc'],
  );
}
