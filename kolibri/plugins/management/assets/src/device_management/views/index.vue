<template>

  <core-base :topLevelPageName="DEVICE" :appBarTitle="$tr('deviceManagementTitle')">
    <div>
      <top-nav />
    </div>
  </core-base>

</template>


<script>

  import Vuex from 'kolibri.lib.vuex';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import topNav from './device-top-nav';

  // store
  import * as coreStore from 'kolibri.coreVue.vuex.store';
  const store = new Vuex.Store({
    state: Object.assign({}, coreStore.initialState),
  });

  export default {
    name: 'deviceManagementRoot',
    components: {
      coreBase,
      topNav,
    },
    computed: {
      DEVICE: () => TopLevelPageNames.DEVICE,
    },
    methods: {

    },
    store,
    vuex: {
      getters: {

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

</style>
