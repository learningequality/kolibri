// QTI Sandbox - Development only
// This file is conditionally loaded only in non-production builds

import QTISandboxPage from './components/QTISandboxPage';

export const sandboxRoutes = [
  {
    name: 'QTI_SANDBOX',
    path: '/qti_sandbox/:itemId?',
    component: QTISandboxPage,
  },
];
