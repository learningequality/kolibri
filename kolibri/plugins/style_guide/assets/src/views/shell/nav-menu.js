import sortBy from 'lodash/sortBy';
import flatten from 'lodash/flatten';

import home from '../content/_home';

import inclusivePage from '../content/inclusive';
import writingPage from '../content/writing';

import buttonsPage from '../content/buttons';
import breadcrumbsPage from '../content/breadcrumbs';
import navbarPage from '../content/navbar';
import checkboxesPage from '../content/checkboxes';
import radioButtonsPage from '../content/radio-buttons';
import textFieldsPage from '../content/text-fields';
import filtersPage from '../content/filters';
import dropdownMenusPage from '../content/dropdown-menus';
import loadersPage from '../content/loaders';

function sortSectionItems(items) {
  return sortBy(items, [item => item.itemName]);
}

const homeRoute = [
  {
    path: `/`,
    component: home,
  },
];

// This data structure contains the navigational links pointing to all the
// content pages in the style guide.
// Notes: This is view-agnostic; it doesn't make assumption on how it will be
// rendered (whether it's a side-nav or a horizontal menu).
const navMenu = [
  {
    sectionName: 'Patterns',
    sectionItems: [
      {
        itemName: 'Inclusive design',
        itemRoute: {
          path: `/patterns/inclusive`,
          component: inclusivePage,
        },
      },
      {
        itemName: 'Writing style',
        itemRoute: {
          path: `/patterns/writing`,
          component: writingPage,
        },
      },
    ],
  },
  {
    sectionName: 'Components',
    sectionItems: sortSectionItems([
      {
        itemName: 'Buttons and links',
        itemRoute: {
          path: `/components/buttons`,
          component: buttonsPage,
        },
      },
      {
        itemName: 'Topic tree breadcrumbs',
        itemRoute: {
          path: `/components/breadcrumbs`,
          component: breadcrumbsPage,
        },
      },
      {
        itemName: 'Horizontal navbar',
        itemRoute: {
          path: `/components/navbar`,
          component: navbarPage,
        },
      },
      {
        itemName: 'Checkboxes',
        itemRoute: {
          path: `/components/checkboxes`,
          component: checkboxesPage,
        },
      },
      {
        itemName: 'Radio Buttons',
        itemRoute: {
          path: `/components/radio-buttons`,
          component: radioButtonsPage,
        },
      },
      {
        itemName: 'Text Fields',
        itemRoute: {
          path: `/components/text-fields`,
          component: textFieldsPage,
        },
      },
      {
        itemName: 'Filters',
        itemRoute: {
          path: `/components/filters`,
          component: filtersPage,
        },
      },
      {
        itemName: 'Dropdown menus',
        itemRoute: {
          path: `/components/dropdown-menus`,
          component: dropdownMenusPage,
        },
      },
      {
        itemName: 'Loaders',
        itemRoute: {
          path: `/components/loaders`,
          component: loadersPage,
        },
      },
    ]),
  },
];

// Extract the routes from the sideNavMenu so they can be added to VueRouter.
// Add in the path to the home page.
const navMenuRoutes = flatten(
  homeRoute.concat(navMenu.map(menuSection => menuSection.sectionItems.map(link => link.itemRoute)))
);

export { navMenu, navMenuRoutes };
