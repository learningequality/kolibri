import sortBy from 'lodash/sortBy';
import flatten from 'lodash/flatten';

import home from '../content/Home';

import inclusivePage from '../content/Inclusive';
import writingPage from '../content/Writing';

import buttonsPage from '../content/Buttons';
import breadcrumbsPage from '../content/Breadcrumbs';
import navbarPage from '../content/Navbar';
import checkboxesPage from '../content/Checkboxes';
import radioButtonsPage from '../content/RadioButtons';
import textFieldsPage from '../content/TextFields';
import filtersPage from '../content/Filters';
import dropdownMenusPage from '../content/DropdownMenus';
import loadersPage from '../content/Loaders';
import modalsPage from '../content/Modals';

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
      {
        itemName: 'Modals',
        itemRoute: {
          path: `/components/modals`,
          component: modalsPage,
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
