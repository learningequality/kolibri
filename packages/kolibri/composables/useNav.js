import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { KolibriIcons } from 'kolibri-design-system/lib/KIcon/iconDefinitions';
import { get } from '@vueuse/core';
import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import logger from 'kolibri.lib.logging';
import { computed, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
import { generateNavRoute } from './generateNavRoutes';

const logging = logger.getLogger(__filename);

export const navItems = [];

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
  if (!navItems.includes(component)) {
    if (validateNavItem(component)) {
      navItems.push(component);
    } else {
      logging.error('Component has invalid url, icon, role, section, or routes');
    }
  } else {
    logging.warn('Component has already been registered');
  }
};

export default function useNav(store) {
  store = store || getCurrentInstance().proxy.$store;
  const route = computed(() => store.state.route);
  const { windowIsSmall } = useKResponsiveWindow();
  const topBarHeight = computed(() => (get(windowIsSmall) ? 56 : 64));
  const exportedItems = computed(() =>
    navItems.map(item => {
      const output = {
        ...item,
        active: window.location.pathname == item.url,
      };
      if (item.routes) {
        output.routes = item.routes.map(routeItem => ({
          ...routeItem,
          href: generateNavRoute(item.url, routeItem.route, get(route).params),
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
