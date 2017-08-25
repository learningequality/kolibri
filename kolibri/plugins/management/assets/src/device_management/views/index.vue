<template>

  <core-base :topLevelPageName="DEVICE" :appBarTitle="$tr('deviceManagementTitle')">
    <div>
      <div class="manage-content">
        <top-navigation />
        <component :is="currentPage" />
      </div>
    </div>
  </core-base>

</template>


<script>

  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../constants';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import topNavigation from './device-top-nav';
  import store from '../state/store';
  import get from 'lodash/fp/get';
  import manageContentPage from './manage-content-page';
  import managePermissionsPage from './manage-permissions-page';
  import userPermissionsPage from './user-permissions-page';

  const pageNameComponentMap = {
    [PageNames.MANAGE_CONTENT_PAGE]: 'manageContentPage',
    [PageNames.MANAGE_PERMISSIONS_PAGE]: 'managePermissionsPage',
    [PageNames.USER_PERMISSIONS_PAGE]: 'userPermissionsPage',
  };

  export default {
    name: 'deviceManagementRoot',
    components: {
      coreBase,
      manageContentPage,
      managePermissionsPage,
      topNavigation,
      userPermissionsPage,
    },
    computed: {
      DEVICE: () => TopLevelPageNames.DEVICE,
      currentPage() {
        return pageNameComponentMap[this.pageName];
      },
    },
    methods: {},
    store,
    vuex: {
      getters: {
        pageName: get('pageName'),
      },
      actions: {},
    },
    $trs: {
      deviceManagementTitle: 'Device',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '../../management-styles.styl'

</style>
