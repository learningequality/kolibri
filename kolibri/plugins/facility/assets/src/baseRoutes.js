import { PageNames } from './constants';

export default {
  classes: {
    name: PageNames.CLASS_MGMT_PAGE,
    path: '/:facility_id?/classes',
  },
  users: {
    name: PageNames.USER_MGMT_PAGE,
    path: '/:facility_id?/users',
  },
  data: {
    name: PageNames.DATA_EXPORT_PAGE,
    path: '/:facility_id?/data',
  },
  settings: {
    name: PageNames.FACILITY_CONFIG_PAGE,
    path: '/:facility_id?/settings',
  },
};
