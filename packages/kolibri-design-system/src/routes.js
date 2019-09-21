import Home from './Home';
import Inclusive from './patterns/Inclusive';
import Writing from './patterns/Writing';
import Colors from './patterns/Colors';
import Buttons from './patterns/Buttons';

// import ComponentDocs from './views/common/ComponentDocs';

// import KCheckboxesAPI from '!vue-doc!kolibri-components/src/KCheckbox';
// import KBreadcrumbsAPI from '!vue-doc!kolibri-components/src/KBreadcrumbs';

const homeRoute = [
  {
    path: `/`,
    component: Home,
    meta: { title: 'Home' },
  },
];

const patternRoutes = [
  {
    path: `/patterns/inclusive`,
    component: Inclusive,
    meta: { title: 'Inclusive design' },
  },
  {
    path: `/patterns/writing`,
    component: Writing,
    meta: { title: 'Writing style' },
  },
  {
    path: `/patterns/colors`,
    component: Colors,
    meta: { title: 'Colors' },
  },
  {
    path: `/patterns/buttons`,
    component: Buttons,
    meta: { title: 'Buttons and links' },
  },
];

const componentRoutes = [
  // {
  //   name: 'KBreadcrumbs',
  //   path: `/components/KBreadcrumbs`,
  //   component: ComponentDocs,
  //   meta: { componentAPI: KBreadcrumbsAPI },
  // },
  // {
  //   name: 'KCheckboxes',
  //   path: `/components/KCheckbox`,
  //   component: ComponentDocs,
  //   meta: { componentAPI: KCheckboxesAPI },
  // },
];

const allRoutes = homeRoute.concat(patternRoutes).concat(componentRoutes);
export { allRoutes, patternRoutes, componentRoutes };
