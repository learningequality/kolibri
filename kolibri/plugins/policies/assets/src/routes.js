import CookiePolicy from './views/CookiePolicy';
import UsageAndPrivacy from './views/UsageAndPrivacy';

export default [
  {
    path: '/cookie_policy',
    name: 'COOKIE_POLICY',
    component: CookiePolicy,
  },
  {
    path: '/usage_and_privacy',
    name: 'USAGE_AND_PRIVACY',
    component: UsageAndPrivacy,
  },
  {
    path: '*',
    redirect: '/cookie_policy',
  },
];
