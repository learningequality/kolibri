import {
  computed,
  effectScope,
  getCurrentInstance,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  watch,
} from 'vue';
import { START_LOCATION } from 'vue-router';
import { toValue, useMutationObserver } from '@vueuse/core';
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

const PARENT_REGISTRATION = Symbol('pageTitleRegistration');

function isAncestor(ancestor, registration) {
  for (let parent = registration; parent; parent = parent.parent) {
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

const showsErrorTitle = computed(() => Boolean(error.value) && !innermost.value?.hasOwnErrorPage);

export const pageHeading = computed(() =>
  innermost.value?.hasVisibleHeading ? '' : joinParts(innermostParts.value),
);

/**
 * The text of a page shell's hidden <h1>, or '' when it should render none.
 * @param {import('vue').Ref<Element>} container - Searched for the page's own <h1>.
 * @param {import('vue').Ref<Element>} hiddenHeading - Skipped in that search.
 * @returns {import('vue').ComputedRef<string>}
 */
export function usePageHeading(container, hiddenHeading) {
  // Assumed until the first check, so a shell's first page never shows two <h1>s on mount.
  const pageHasHeading = ref(true);
  function update() {
    const headings = container.value?.querySelectorAll('h1') || [];
    pageHasHeading.value = [...headings].some(heading => heading !== hiddenHeading.value);
  }
  const observed = computed(() => (innermost.value?.hasVisibleHeading ? container.value : null));
  // A new registration re-observes, which drops that flush's mutation records.
  watch([observed, innermost], update, { flush: 'post' });
  useMutationObserver(observed, update, { childList: true, subtree: true });
  const heading = computed(() =>
    pageHasHeading.value ? pageHeading.value : joinParts(innermostParts.value),
  );
  watch([heading, pageHasHeading], focusPendingHeading, { flush: 'post' });
  return heading;
}

// watch() reads its sources at import, before i18nSetup() resolves, so they must not translate.
// Not immediate: the server-rendered site title, or vue-meta's, stands until a page registers.
watch([innermostParts, showsErrorTitle, metaInfoComponents], ([parts, isError, metaInfoCount]) => {
  if (metaInfoCount) {
    return;
  }
  document.title = formatDocumentTitle(isError ? [errorPageTitle$()] : parts);
});

// vue-router 3 gives each route only its own record's meta, so a panel's child routes are
// found through `matched`.
function panelIndex(route) {
  return route.matched.findIndex(record => record.meta.panel);
}

function staysOnKeepFocusRoute(to, from) {
  const index = to.matched.findIndex(record => record.meta.keepFocus);
  if (index === -1 || to.matched.length !== from.matched.length) {
    return false;
  }
  const record = to.matched[index];
  const fromRecord = from.matched[index];
  return (
    fromRecord.meta.keepFocus &&
    (fromRecord === record || (record.parent && fromRecord.parent === record.parent))
  );
}

function closesPanel(to, from, routeUnderPanel) {
  return (
    panelIndex(from) !== -1 &&
    Boolean(routeUnderPanel) &&
    (to.path === routeUnderPanel.path || staysOnKeepFocusRoute(to, routeUnderPanel))
  );
}

function focusRequest(holder, onlyIfRemoved) {
  return holder && holder !== document.body ? { holder, onlyIfRemoved } : null;
}

function pageRegistration() {
  let registration = innermost.value;
  while (registration?.parent) {
    registration = registration.parent;
  }
  return registration;
}

function holderRemoved(holder) {
  return !holder.isConnected && document.activeElement === document.body;
}

function focusMovedOn({ holder }) {
  return !holderRemoved(holder) && document.activeElement !== holder;
}

function focusPendingHeading() {
  const registration = pageRegistration();
  if (!registration?.pendingFocus) {
    return;
  }
  if (focusMovedOn(registration.pendingFocus)) {
    registration.pendingFocus = null;
    return;
  }
  const { holder, onlyIfRemoved } = registration.pendingFocus;
  if (onlyIfRemoved && !holderRemoved(holder)) {
    return;
  }
  const heading = focusPageHeading();
  if (heading) {
    registration.pendingFocus = { holder: heading, onlyIfRemoved: false };
  }
}

/**
 * Focuses the first <h1> in the page's main region, making it focusable if it is not.
 * @returns {HTMLElement|null} The focused <h1>, or null if none took focus.
 */
export function focusPageHeading() {
  const region = document.querySelector('#main, [role="main"]') ?? document;
  const heading = region.querySelector('h1');
  if (!heading) {
    return null;
  }
  if (!heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1');
  }
  heading.focus();
  return document.activeElement === heading ? heading : null;
}

watch(innermost, () => nextTick(focusPendingHeading));

function rendersSamePage(to, from) {
  return (
    to.matched.length === from.matched.length &&
    to.matched.every(
      (record, index) => record.components.default === from.matched[index].components.default,
    )
  );
}

function handToNextPage(pendingFocus, root) {
  const scope = effectScope(true);
  scope.run(() => {
    watch(
      () => root.$route,
      (to, from) => {
        if (rendersSamePage(to, from) && (to.path === from.path || !focusMovedOn(pendingFocus))) {
          return;
        }
        const changesPage =
          to.path !== from.path && panelIndex(to) === -1 && panelIndex(from) === -1;
        pendingFocus = changesPage ? focusRequest(document.activeElement, true) : null;
        if (!pendingFocus) {
          scope.stop();
        }
      },
      { flush: 'sync' },
    );
    watch(
      innermost,
      () => {
        const next = pageRegistration();
        if (!next) {
          return;
        }
        next.receiveFocus?.(pendingFocus);
        scope.stop();
      },
      { flush: 'sync' },
    );
  });
}

function trackPageFocus(registration) {
  const vm = getCurrentInstance().proxy;
  if (!vm.$route) {
    return;
  }
  const onPanelRoute = panelIndex(vm.$route) !== -1;
  registration.receiveFocus = pendingFocus => {
    if (!registration.pendingFocus && !onPanelRoute) {
      registration.pendingFocus = pendingFocus;
    }
  };
  const outgoing = pageRegistration();
  if (outgoing) {
    registration.pendingFocus = outgoing.pendingFocus;
    outgoing.pendingFocus = null;
  } else if (!onPanelRoute) {
    // Vue 2 runs a route component's setup() before the patch removes the outgoing one.
    registration.pendingFocus = focusRequest(document.activeElement, true);
  }
  let routeUnderPanel = null;
  let lastFocused = null;
  function noteFocus(event) {
    lastFocused = event.target;
  }
  function noteRouteChange(to, from) {
    if (panelIndex(to) !== -1 && panelIndex(from) === -1) {
      routeUnderPanel = from;
    }
    if (
      from === START_LOCATION ||
      to.path === from.path ||
      panelIndex(to) !== -1 ||
      closesPanel(to, from, routeUnderPanel)
    ) {
      registration.pendingFocus = null;
      return;
    }
    const active = document.activeElement;
    const holder =
      active === document.body && lastFocused?.isConnected === false ? lastFocused : active;
    const request = focusRequest(holder, staysOnKeepFocusRoute(to, from));
    if (request || registration.pendingFocus?.holder.isConnected) {
      registration.pendingFocus = request;
    }
  }
  let mountedEl = null;
  // Vue 2 notifies a reactive value's watchers in subscription order, and the <router-view>
  // host's render watcher subscribed to $route first, so this nextTick lands after its render.
  onMounted(() => {
    mountedEl = vm.$el;
    mountedEl.addEventListener('focusin', noteFocus);
    watch(
      () => vm.$route,
      (to, from) => {
        noteRouteChange(to, from);
        nextTick(focusPendingHeading);
      },
      { flush: 'sync' },
    );
  });
  onUnmounted(() => {
    mountedEl.removeEventListener('focusin', noteFocus);
    if (registration.pendingFocus) {
      handToNextPage(registration.pendingFocus, vm.$root);
    }
  });
}

/**
 * Registers the calling route component's title for the browser tab and the page's hidden <h1>.
 * The innermost mounted registration wins; it is removed when its component unmounts.
 * Call once per component.
 * Throws after mount if another registrant is neither an ancestor nor a descendant of this one.
 * After each page change, focuses the page's <h1> once it renders, unless the routes' matched
 * records set these `meta` flags:
 * - `panel`: a side panel or modal route; opening and closing it leaves focus to the panel.
 * - `keepFocus`: a param change on the same route, or a switch to a sibling route that also
 *   sets it, keeps focus on in-page controls such as tabs. If the change removes the focused
 *   control, as a reload does, the <h1> takes focus.
 * @param {string|string[]|import('vue').Ref|Function} title - The title, or its parts from
 * most to least specific, as a string or array of strings, or a ref or getter of either.
 * @param {object} [options] - What the page renders itself.
 * @param {boolean} [options.hasVisibleHeading=false] - The page renders its own visible <h1>;
 * the page shell's hidden one stands in only while the shell's default slot holds none.
 * @param {boolean} [options.hasOwnErrorPage=false] - The page renders its own error state, so
 * its title stands while an app error is set.
 * @returns {{ documentTitle: import('vue').ComputedRef<string> }} This registration's title as
 * formatted for the browser tab.
 */
export default function usePageTitle(
  title,
  { hasVisibleHeading = false, hasOwnErrorPage = false } = {},
) {
  const registration = {
    title,
    hasVisibleHeading,
    hasOwnErrorPage,
    parent: inject(PARENT_REGISTRATION, null),
    pendingFocus: null,
  };
  provide(PARENT_REGISTRATION, registration);
  if (!registration.parent) {
    trackPageFocus(registration);
  }
  registrations.value = [...registrations.value, registration];
  // Checked after the render flush, as a replaced page unmounts after its replacement mounts.
  onMounted(async () => {
    await nextTick();
    if (!registrations.value.includes(registration)) {
      return;
    }
    const conflict = registrations.value.find(
      r => !isAncestor(r, registration) && !isAncestor(registration, r),
    );
    if (conflict) {
      throw new Error(
        `usePageTitle: "${joinParts(toParts(registration.title))}" and ` +
          `"${joinParts(toParts(conflict.title))}" are both registered, and neither contains the other`,
      );
    }
  });
  onUnmounted(() => {
    registrations.value = registrations.value.filter(r => r !== registration);
  });
  return { documentTitle: computed(() => formatDocumentTitle(toParts(title))) };
}
