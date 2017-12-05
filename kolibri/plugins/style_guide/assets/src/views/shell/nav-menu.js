import sortBy from 'lodash/sortBy';
import flatten from 'lodash/flatten';
import buttonsPage from '../content/buttons';
import breadcrumbsPage from '../content/breadcrumbs';
import navbarPage from '../content/navbar';
import checkboxesPage from '../content/checkboxes';
import radioButtonsPage from '../content/radio-buttons';
import textFieldsPage from '../content/text-fields';
import filtersPage from '../content/filters';
import home from '../content/_home';

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
    ]),
  },
];

// Extract the routes from the sideNavMenu so they can be added to VueRouter.
// Add in the path to the home page.
const navMenuRoutes = flatten(
  homeRoute.concat(navMenu.map(menuSection => menuSection.sectionItems.map(link => link.itemRoute)))
);

export { navMenu, navMenuRoutes };
