import ViewerSandboxPage from './views/ViewerSandboxPage';

export default [
  {
    path: '/:viewerId?/:itemId?',
    name: 'VIEWER_SANDBOX',
    component: ViewerSandboxPage,
  },
  { path: '*', redirect: '/' },
];
