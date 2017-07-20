import { sortBy, flatten } from 'lodash';

import kButton from '../content/components/k-button';
import typography from '../content/style/typography';
import checkboxes from '../content/components/checkboxes';
import radioButtons from '../content/components/radio-buttons';
import textFields from '../content/components/text-fields';
import simpleModals from '../content/components/simple-modals';
import filters from '../content/components/filters';
import kBreadcrumbs from '../content/components/k-breadcrumbs';
import tabs from '../content/components/tabs';
import homePage from '../content/home/home-page';

function sortSectionItems(items) {
  return sortBy(items, [item => item.itemName]);
}

const homeRoute = [
  {
    path: `/`,
    component: homePage,
  },
];

const componentsMap = {
  kButton: 'k-button',
  kBreadcrumbs: 'k-breadcrumbs',
};

// This data structure contains the navigational links pointing to all the
// content pages in the style guide.
// Notes: This is view-agnostic; it doesn't make assumption on how it will be
// rendered (whether it's a side-nav or a horizontal menu).
const navMenu = [
  /*
  {
    sectionName: 'Styles',
    sectionItems: sortSectionItems([
      {
        itemName: 'Typography',
        itemRoute: {
          path: `${BASE}/typography`,
          component: typography,
        },
      },
    ]),
  },
  */
  {
    sectionName: 'Components',
    sectionItems: sortSectionItems([
      {
        itemName: componentsMap.kButton,
        itemRoute: {
          path: `/components/${componentsMap.kButton}`,
          component: kButton,
        },
      },
      {
        itemName: componentsMap.kBreadcrumbs,
        itemRoute: {
          path: `/components/${componentsMap.kBreadcrumbs}`,
          component: kBreadcrumbs,
        },
      },
      /*
      {
        itemName: 'Checkboxes',
        itemRoute: {
          path: `${BASE}/components/checkboxes`,
          component: checkboxes,
        },
      },
      {
        itemName: 'Radio buttons',
        itemRoute: {
          path: `${BASE}/components/radio-buttons`,
          component: radioButtons,
        },
      },
      {
        itemName: 'Text fields',
        itemRoute: {
          path: `${BASE}/components/text-fields`,
          component: textFields,
        },
      },
      {
        itemName: 'Simple modals',
        itemRoute: {
          path: `${BASE}/components/simple-modals`,
          component: simpleModals,
        },
      },
      {
        itemName: 'Filters',
        itemRoute: {
          path: `${BASE}/components/filters`,
          component: filters,
        },
      },
      {
        itemName: 'Tabs',
        itemRoute: {
          path: `${BASE}/components/tabs`,
          component: tabs,
        },
      },
      */
    ]),
  },
];

// Extract the routes from the sideNavMenu so they can be added to VueRouter.
// Add in the path to the home page.
const navMenuRoutes = flatten(
  homeRoute.concat(navMenu.map(menuSection => menuSection.sectionItems.map(link => link.itemRoute)))
);

export { navMenu, navMenuRoutes };
