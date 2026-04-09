import { ref, watch, computed } from 'vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { KolibriIcons } from 'kolibri-design-system/lib/KIcon/iconDefinitions';
import { i18nReady } from 'kolibri/utils/i18n';
import { get } from '@vueuse/core';
import { UserKinds, NavComponentSections } from 'kolibri/constants';
import logger from 'kolibri-logging';
import { useRoute } from 'vue-router/composables';
import { generateNavRoute } from './internal/generateNavRoutes';

const logging = logger.getLogger(__filename);

export const navItems = ref([]);
const _tempNavItems = [];

function checkDeclared(property) {
  return typeof property !== 'undefined' && property !== null;
}

function validateUrl(url) {
  return checkDeclared(url) && typeof url === 'string';
}

function validateIcon(icon) {
  return checkDeclared(icon) && typeof icon === 'string' && Boolean(KolibriIcons[icon]);
}

function validateRole(role) {
  // Optional, must be one of the defined UserKinds
  return !checkDeclared(role) || Object.values(UserKinds).includes(role);
}

function validateSection(section) {
  // Optional, must be one of the defined NavComponentSections
  return !checkDeclared(section) || Object.values(NavComponentSections).includes(section);
}

function validateRoutes(routes) {
  // Not required, if exists, must be an array of objects
  // with label, route, name, and icon properties that are
  // all strings.
  return (
    !checkDeclared(routes) ||
    (Array.isArray(routes) &&
      routes.every(route => {
        return (
          checkDeclared(route.label) &&
          checkDeclared(route.route) &&
          checkDeclared(route.name) &&
          checkDeclared(route.icon) &&
          typeof route.label === 'string' &&
          typeof route.route === 'string' &&
          typeof route.name === 'string' &&
          typeof route.icon === 'string'
        );
      }))
  );
}

function validateNavItem(component) {
  return (
    validateUrl(component.url) &&
    validateIcon(component.icon) &&
    validateRole(component.role) &&
    validateSection(component.section) &&
    validateRoutes(component.routes)
  );
}

export const registerNavItem = component => {
  if (!i18nReady.value) {
    _tempNavItems.push(component);
    return;
  }
  if (!navItems.value.includes(component)) {
    if (validateNavItem(component)) {
      navItems.value = [...navItems.value, component];
    } else {
      logging.error('Component has invalid url, icon, role, section, or routes');
    }
  } else {
    logging.warn('Component has already been registered');
  }
};

const _watcher = watch(i18nReady, newValue => {
  if (newValue) {
    for (const component of _tempNavItems) {
      registerNavItem(component);
    }
    _tempNavItems.length = 0;
    _watcher();
  }
});

export default function useNav() {
  const route = useRoute();
  const { windowIsSmall } = useKResponsiveWindow();
  const topBarHeight = computed(() => (get(windowIsSmall) ? 56 : 64));
  const exportedItems = computed(() =>
    navItems.value.map(item => {
      const output = {
        ...item,
        active: window.location.pathname == item.url,
      };
      if (item.routes) {
        output.routes = item.routes.map(routeItem => ({
          ...routeItem,
          href: generateNavRoute(item.url, routeItem.route, route.params),
        }));
      }
      return output;
    }),
  );
  return {
    navItems: exportedItems,
    topBarHeight,
  };
}
