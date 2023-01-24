import { PageNames } from './constants';

export default [
  {
    name: PageNames.CLASS_MGMT_PAGE,
    path: '/:facility_id?/classes',
  },
  {
    name: PageNames.USER_MGMT_PAGE,
    path: '/:facility_id?/users',
  },
  {
    name: PageNames.DATA_EXPORT_PAGE,
    path: '/:facility_id?/data',
  },
  {
    name: PageNames.FACILITY_CONFIG_PAGE,
    path: '/:facility_id?/settings',
  },
];
