import Home from './views/content/Home';
import Inclusive from './views/content/Inclusive';
import Writing from './views/content/Writing';
import Colors from './views/content/Colors';
import Buttons from './views/content/Buttons';

// import Breadcrumbs from './views/content/Breadcrumbs';
// import Navbar from './views/content/Navbar';
import Checkboxes from './views/content/Checkboxes';
// import RadioButtons from './views/content/RadioButtons';
// import TextFields from './views/content/TextFields';
// import Filters from './views/content/Filters';
// import DropdownMenus from './views/content/DropdownMenus';
// import Loaders from './views/content/Loaders';
// import Modals from './views/content/Modals';
// import Grids from './views/content/Grids';
// import Tooltips from './views/content/Tooltips';

import ComponentDocs from './views/shell/ComponentDocs';

import KBreadcrumbs from '!vue-doc!kolibri.coreVue.components.KBreadcrumbs';

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
  {
    path: `/patterns/checkboxes`,
    component: Checkboxes,
    meta: { title: 'Checkboxes and radio buttons' },
  },
];

const componentRoutes = [
  {
    path: `/api/KBreadcrumbs`,
    component: ComponentDocs,
    meta: { componentAPI: KBreadcrumbs },
  },
  // {
  //   path: `/components/navbar`,
  //   component: Navbar,
  //   meta: { title: 'Horizontal navbar' },
  // },
  // {
  //   path: `/components/radio-buttons`,
  //   component: RadioButtons,
  //   meta: { title: 'Radio Buttons' },
  // },
  // {
  //   path: `/components/text-fields`,
  //   component: TextFields,
  //   meta: { title: 'Text Fields' },
  // },
  // {
  //   path: `/components/filters`,
  //   component: Filters,
  //   meta: { title: 'Filters' },
  // },
  // {
  //   path: `/components/dropdown-menus`,
  //   component: DropdownMenus,
  //   meta: { title: 'Dropdown menus' },
  // },
  // {
  //   path: `/components/loaders`,
  //   component: Loaders,
  //   meta: { title: 'Loaders' },
  // },
  // {
  //   path: `/components/modals`,
  //   component: Modals,
  //   meta: { title: 'Modals' },
  // },
  // {
  //   path: `/components/grids`,
  //   component: Grids,
  //   meta: { title: 'Grids' },
  // },
  // {
  //   path: `/components/tooltips`,
  //   component: Tooltips,
  //   meta: { title: 'Tooltips' },
  // },
];

const allRoutes = homeRoute.concat(patternRoutes).concat(componentRoutes);
export { allRoutes, patternRoutes, componentRoutes };
