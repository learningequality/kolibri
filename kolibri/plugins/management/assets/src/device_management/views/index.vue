<template>

  <core-base :topLevelPageName="DEVICE" :appBarTitle="$tr('deviceManagementTitle')">
    <div>
      <div class="manage-content">
        <top-navigation />
        <div class="page">
          {{ pageName }}
        </div>
      </div>
    </div>
  </core-base>

</template>


<script>

  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import topNavigation from './device-top-nav';
  import store from '../state/store';
  import get from 'lodash/fp/get';

  export default {
    name: 'deviceManagementRoot',
    components: {
      coreBase,
      topNavigation,
    },
    computed: {
      DEVICE: () => TopLevelPageNames.DEVICE,
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
