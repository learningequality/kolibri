const _ = require('lodash');

// This data structure contains the navigational links pointing to all the
// content pages in the style guide.
// Notes: This is view-agnostic; it doesn't make assumption on how it will be
// rendered (whether it's a side-nav or a horizontal menu).
const navigationMenu = [
  {
    sectionHeading: 'Styles',
    sectionLinks: [
      {
        linkLabel: 'Typography',
        linkRoute: {
          path: '/typograhy',
          component: require('../content/typography')
        }
      },
    ]
  },
  {
    sectionHeading: 'Components',
    sectionLinks: [
      {
        linkLabel: 'Button',
        linkRoute: {
          path: '/button',
          component: require('../content/button')
        }
      },
      {
        linkLabel: 'Tab',
        linkRoute: {
          path: '/tab',
          component: require('../content/tab')
        }
      }
    ]
  }
];

// Extract the routes from the sideNavMenu so they can be added to VueRouter.
const navigationMenuRoutes = _.flatten(
    navigationMenu.map(menuSection =>
        menuSection.sectionLinks.map(link => link.linkRoute)));

module.exports = {navigationMenu, navigationMenuRoutes};
