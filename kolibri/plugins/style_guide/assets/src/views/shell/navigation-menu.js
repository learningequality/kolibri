import { sortBy, flatten } from 'lodash';
import typography from '../content/style/typography';
import checkboxes from '../content/components/checkboxes';
import radioButtons from '../content/components/radio-buttons';
import buttons from '../content/components/buttons';
import textFields from '../content/components/text-fields';
import simpleModals from '../content/components/simple-modals';
import filters from '../content/components/filters';
import breadcrumbs from '../content/components/breadcrumbs';
import tabs from '../content/components/tabs';
import homePage from '../content/home/home-page';

const sortSectionLink = links => sortBy(links, [link => link.linkLabel]);
const base = '/style_guide';

const homeRoute = [
  {
    path: `${base}/`,
    component: homePage,
  },
];

// This data structure contains the navigational links pointing to all the
// content pages in the style guide.
// Notes: This is view-agnostic; it doesn't make assumption on how it will be
// rendered (whether it's a side-nav or a horizontal menu).
const navigationMenu = [
  {
    sectionHeading: 'Styles',
    sectionLinks: sortSectionLink([
      {
        linkLabel: 'Typography',
        linkRoute: {
          path: `${base}/typography`,
          component: typography,
        },
      },
    ]),
  },
  {
    sectionHeading: 'Components',
    sectionLinks: sortSectionLink([
      {
        linkLabel: 'Checkboxes',
        linkRoute: {
          path: `${base}/components/checkboxes`,
          component: checkboxes,
        },
      },
      {
        linkLabel: 'Radio buttons',
        linkRoute: {
          path: `${base}/components/radio-buttons`,
          component: radioButtons,
        },
      },
      {
        linkLabel: 'Buttons',
        linkRoute: {
          path: `${base}/components/buttons`,
          component: buttons,
        },
      },
      {
        linkLabel: 'Text fields',
        linkRoute: {
          path: `${base}/components/text-fields`,
          component: textFields,
        },
      },
      {
        linkLabel: 'Simple modals',
        linkRoute: {
          path: `${base}/components/simple-modals`,
          component: simpleModals,
        },
      },
      {
        linkLabel: 'Filters',
        linkRoute: {
          path: `${base}/components/filters`,
          component: filters,
        },
      },
      {
        linkLabel: 'Breadcrumbs',
        linkRoute: {
          path: `${base}/components/breadcrumbs`,
          component: breadcrumbs,
        },
      },
      {
        linkLabel: 'Tabs',
        linkRoute: {
          path: `${base}/components/tabs`,
          component: tabs,
        },
      },
    ]),
  },
];

// Extract the routes from the sideNavMenu so they can be added to VueRouter.
// Add in the path to the home page.
const navigationMenuRoutes = flatten(
  homeRoute.concat(
    navigationMenu.map(menuSection => menuSection.sectionLinks.map(link => link.linkRoute))
  )
);
export { navigationMenu, navigationMenuRoutes };
