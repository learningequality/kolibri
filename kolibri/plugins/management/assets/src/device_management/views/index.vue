<template>

  <core-base :topLevelPageName="DEVICE" :appBarTitle="$tr('deviceManagementTitle')">
    <div>
      <div class="manage-content">
        <top-navigation />
        <component class="page" :is="currentPage" />
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
  import manageContentPage from '../../views/manage-content-page';

  const pageNameComponentMap = {
    [PageNames.DEVICE_CONTENT_MGMT_PAGE]: 'manageContentPage',
    [PageNames.DEVICE_PERMISSIONS_MGMT_PAGE]: 'managePermissionsPage',
  };

  export default {
    name: 'deviceManagementRoot',
    components: {
      coreBase,
      manageContentPage,
      topNavigation,
    },
    computed: {
      DEVICE: () => TopLevelPageNames.DEVICE,
      currentPage() {
        return pageNameComponentMap[this.pageName];
      },
    },
    methods: {

    },
    store,
    vuex: {
      getters: {
        pageName: get('pageName'),
      },
      actions: {

      },
    },
    $trs: {
      deviceManagementTitle: 'Device',
    },
  }

</script>


<style lang="stylus" scoped>

  @require '../../management-styles.styl'

</style>
