import sortBy from 'lodash/sortBy';
import flatten from 'lodash/flatten';

import Home from './views/content/Home';

import InclusivePage from './views/content/Inclusive';
import WritingPage from './views/content/Writing';

import ButtonsPage from './views/content/Buttons';
import BreadcrumbsPage from './views/content/Breadcrumbs';
import NavbarPage from './views/content/Navbar';
import CheckboxesPage from './views/content/Checkboxes';
import RadioButtonsPage from './views/content/RadioButtons';
import TextFieldsPage from './views/content/TextFields';
import FiltersPage from './views/content/Filters';
import DropdownMenusPage from './views/content/DropdownMenus';
import LoadersPage from './views/content/Loaders';
import ModalsPage from './views/content/Modals';
import GridsPage from './views/content/Grids';
import TooltipsPage from './views/content/Tooltips';

function sortSectionItems(items) {
  return sortBy(items, [item => item.itemName]);
}

const homeRoute = [
  {
    path: `/`,
    component: Home,
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
          component: InclusivePage,
        },
      },
      {
        itemName: 'Writing style',
        itemRoute: {
          path: `/patterns/writing`,
          component: WritingPage,
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
          component: ButtonsPage,
        },
      },
      {
        itemName: 'Topic tree breadcrumbs',
        itemRoute: {
          path: `/components/breadcrumbs`,
          component: BreadcrumbsPage,
        },
      },
      {
        itemName: 'Horizontal navbar',
        itemRoute: {
          path: `/components/navbar`,
          component: NavbarPage,
        },
      },
      {
        itemName: 'Checkboxes',
        itemRoute: {
          path: `/components/checkboxes`,
          component: CheckboxesPage,
        },
      },
      {
        itemName: 'Radio Buttons',
        itemRoute: {
          path: `/components/radio-buttons`,
          component: RadioButtonsPage,
        },
      },
      {
        itemName: 'Text Fields',
        itemRoute: {
          path: `/components/text-fields`,
          component: TextFieldsPage,
        },
      },
      {
        itemName: 'Filters',
        itemRoute: {
          path: `/components/filters`,
          component: FiltersPage,
        },
      },
      {
        itemName: 'Dropdown menus',
        itemRoute: {
          path: `/components/dropdown-menus`,
          component: DropdownMenusPage,
        },
      },
      {
        itemName: 'Loaders',
        itemRoute: {
          path: `/components/loaders`,
          component: LoadersPage,
        },
      },
      {
        itemName: 'Modals',
        itemRoute: {
          path: `/components/modals`,
          component: ModalsPage,
        },
      },
      {
        itemName: 'Grids',
        itemRoute: {
          path: `/components/grids`,
          component: GridsPage,
        },
      },
      {
        itemName: 'Tooltips',
        itemRoute: {
          path: `/components/tooltips`,
          component: TooltipsPage,
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
