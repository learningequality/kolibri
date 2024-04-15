import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import { KolibriIcons } from 'kolibri-design-system/lib/KIcon/iconDefinitions';
import { get } from '@vueuse/core';
import { UserKinds, NavComponentSections } from 'kolibri.coreVue.vuex.constants';
import logger from 'kolibri.lib.logging';
import { computed } from 'kolibri.lib.vueCompositionApi';

const logging = logger.getLogger(__filename);

export const navComponents = [];

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
  // Required, must be an array of objects
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
  if (!navComponents.includes(component)) {
    if (validateNavItem(component)) {
      navComponents.push(component);
    } else {
      logging.error('Component has invalid priority, role, section, or routes');
    }
  } else {
    logging.warn('Component has already been registered');
  }
};

export default function useNav() {
  const { windowIsSmall } = useKResponsiveWindow();
  const topBarHeight = computed(() => (get(windowIsSmall) ? 56 : 64));
  const exportedComponents = navComponents.map(component => ({
    ...component,
    active: window.location.pathname == component.url,
  }));
  return {
    navComponents: exportedComponents,
    topBarHeight,
  };
}
