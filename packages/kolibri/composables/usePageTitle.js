import { computed, onUnmounted, shallowRef, watch } from 'vue';
import { toValue } from '@vueuse/core';
import { createTranslator, currentLanguage, isRtl } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { error } from 'kolibri/utils/appError';

const { kolibriTitleMessage$, errorPageTitle$ } = createTranslator('PageTitleStrings', {
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

// setup() runs parent-first, so the last registration is the innermost.
const registrations = shallowRef([]);

const innermost = computed(() => registrations.value[registrations.value.length - 1]);

const pageTitle = computed(() => {
  if (!innermost.value) {
    return '';
  }
  const parts = [].concat(toValue(innermost.value.title)).filter(Boolean);
  return (isRtl(currentLanguage) ? parts.reverse() : parts).join(' - ');
});

export const pageHeading = computed(() =>
  innermost.value?.hasVisibleHeading ? '' : pageTitle.value,
);

// watch() reads its sources at import, before i18nSetup() resolves, so they must not translate.
// Not immediate: the server-rendered site title, or vue-meta's, stands until a page registers.
watch([pageTitle, error], ([title, err]) => {
  if (err) {
    document.title = kolibriTitleMessage$({ title: errorPageTitle$() });
  } else {
    document.title = title ? kolibriTitleMessage$({ title }) : coreStrings.kolibriLabel$();
  }
});

/**
 * Registers the calling route component's title for the browser tab and the page's hidden <h1>.
 * The innermost mounted registration wins; it is removed when its component unmounts.
 * @param {string|string[]|import('vue').Ref|Function} title - The title, or its parts from
 * most to least specific, as a string or array of strings, or a ref or getter of either.
 * @param {object} [options] - Heading options.
 * @param {boolean} [options.hasVisibleHeading=false] - The page renders its own visible <h1>,
 * so the page shell renders no hidden one.
 */
export default function usePageTitle(title, { hasVisibleHeading = false } = {}) {
  const registration = { title, hasVisibleHeading };
  registrations.value = [...registrations.value, registration];
  onUnmounted(() => {
    registrations.value = registrations.value.filter(r => r !== registration);
  });
}
