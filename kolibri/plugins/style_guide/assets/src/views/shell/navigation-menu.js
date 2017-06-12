const _ = require('lodash');

const sortSectionLink = (links) => _.sortBy(links, [(link) => link.linkLabel]);
const base = '/style_guide';

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
          component: require('../content/style/typography')
        }
      },
    ])
  },
  {
    sectionHeading: 'Components',
    sectionLinks: sortSectionLink([
      {
        linkLabel: 'Checkboxes',
        linkRoute: {
          path: '/components/checkboxes',
          component: require('../content/components/checkboxes')
        }
      },
      {
<<<<<<< HEAD
        linkLabel: 'Icon Button',
        linkRoute: {
          path: '/iconbutton',
          component: require('../content/components/icon-button')
=======
        linkLabel: 'Radio buttons',
        linkRoute: {
          path: `${base}/button`,
          component: require('../content/components/radio_buttons')
>>>>>>> upstream/style_guide
        }
      },
      {
        linkLabel: 'Buttons',
        linkRoute: {
          path: `${base}/tab`,
          component: require('../content/components/buttons')
        }
      },
      {
        linkLabel: 'Text fields',
        linkRoute: {
          path: `${base}/textbox`,
          component: require('../content/components/text_fields')
        }
      }
    ])
  }
];

// Extract the routes from the sideNavMenu so they can be added to VueRouter.
const navigationMenuRoutes = _.flatten(
    navigationMenu.map(menuSection =>
        menuSection.sectionLinks.map(link => link.linkRoute)));

module.exports = { navigationMenu, navigationMenuRoutes };
