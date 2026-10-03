import {
  computed,
  getCurrentInstance,
  nextTick,
  onMounted,
  onUnmounted,
  shallowRef,
  watch,
} from 'vue';
import { toValue } from '@vueuse/core';
import { createTranslator, currentLanguage, isRtl } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { error } from 'kolibri/utils/appError';
import { metaInfoComponents } from './internal/metaInfoTracker';

const { errorPageTitle$ } = createTranslator('PageTitleStrings', {
  errorPageTitle: {
    message: 'Error',
    context:
      "When Kolibri throws an error, this is the text that's used as the title of the error page. The description of the error follows below.",
  },
});

const RLM = '\u200F';
// Wikipedia's per-wiki page titles use ASCII ' - ' in every RTL wiki checked.
const SEPARATOR = ' - ';

// Windows 10 title bars draw FSI/PDI isolates as boxes, so RTL separators are RLM-flanked instead.
function joinParts(parts) {
  const separator = isRtl(currentLanguage) ? `${RLM}${SEPARATOR}${RLM}` : SEPARATOR;
  return parts.filter(Boolean).join(separator);
}

function formatDocumentTitle(parts) {
  const title = joinParts([...parts, coreStrings.kolibriLabel$()]);
  return isRtl(currentLanguage) ? `${RLM}${title}` : title;
}

// setup() runs parent-first, so the last registration is the innermost.
const registrations = shallowRef([]);

function isAncestor(ancestor, component) {
  for (let parent = component; parent; parent = parent.$parent) {
    if (parent === ancestor) {
      return true;
    }
  }
  return false;
}

function toParts(title) {
  return [].concat(toValue(title));
}

const innermost = computed(() => registrations.value[registrations.value.length - 1]);

const innermostParts = computed(() => (innermost.value ? toParts(innermost.value.title) : []));

export const pageHeading = computed(() =>
  innermost.value?.hasVisibleHeading ? '' : joinParts(innermostParts.value),
);

// watch() reads its sources at import, before i18nSetup() resolves, so they must not translate.
// Not immediate: the server-rendered site title, or vue-meta's, stands until a page registers.
watch([innermostParts, error, metaInfoComponents], ([parts, err, metaInfoCount]) => {
  if (metaInfoCount) {
    return;
  }
  document.title = formatDocumentTitle(err ? [errorPageTitle$()] : parts);
});

export function focusPageHeading() {
  if (!registrations.value.length) {
    return;
  }
  const heading = document.querySelector('#main h1');
  if (!heading) {
    return;
  }
  if (!heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1');
  }
  heading.focus();
}

/**
 * Registers the calling route component's title for the browser tab and the page's hidden <h1>.
 * The innermost mounted registration wins; it is removed when its component unmounts.
 * While any title is registered, the router focuses the page's <h1> after each page change.
 * Throws after mount if another registrant is neither an ancestor nor a descendant of this one.
 * @param {string|string[]|import('vue').Ref|Function} title - The title, or its parts from
 * most to least specific, as a string or array of strings, or a ref or getter of either.
 * @param {object} [options] - Heading options.
 * @param {boolean} [options.hasVisibleHeading=false] - The page renders its own visible <h1>,
 * so the page shell renders no hidden one.
 * @returns {{ documentTitle: import('vue').ComputedRef<string> }} This registration's title as
 * formatted for the browser tab.
 */
export default function usePageTitle(title, { hasVisibleHeading = false } = {}) {
  const registration = { title, hasVisibleHeading, component: getCurrentInstance().proxy };
  registrations.value = [...registrations.value, registration];
  // Checked after the render flush, as a replaced page unmounts after its replacement mounts.
  onMounted(async () => {
    await nextTick();
    if (!registrations.value.includes(registration)) {
      return;
    }
    const conflict = registrations.value.find(
      r =>
        !isAncestor(r.component, registration.component) &&
        !isAncestor(registration.component, r.component),
    );
    if (conflict) {
      throw new Error(
        `usePageTitle: ${registration.component.$options.name} and ` +
          `${conflict.component.$options.name} both register a title, and neither contains the other`,
      );
    }
  });
  onUnmounted(() => {
    registrations.value = registrations.value.filter(r => r !== registration);
  });
  return { documentTitle: computed(() => formatDocumentTitle(toParts(title))) };
}
