<template>

  <subpage-container>

      <auth-message v-if="!isSuperuser" authorizedRole="superuser" />

      <div v-else>
        <div class="pure-g">
          <responsive b3="pure-u-1-2" default="pure-u-1-1">
            <h1>{{ $tr('devicePermissionsHeader') }}</h1>
            <p>{{ $tr('devicePermissionsDescription') }}</p>
          </responsive>
          <responsive b3="pure-u-1-2" default="pure-u-1-1">
            <search-bar v-model="searchFilterText" />
          </responsive>
        </div>

        <user-grid class="user-grid" />
      </div>

  </subpage-container>

</template>


<script>

  import authMessage from 'kolibri.coreVue.components.authMessage';
  import { isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import searchBar from './search-bar';
  import userGrid from './user-grid';
  import subpageContainer from '../containers/subpage-container';
  import responsive from '../containers/responsive-container';

  export default {
    name: 'deviceManagementPage',
    components: {
      authMessage,
      responsive,
      searchBar,
      subpageContainer,
      userGrid,
    },
    data() {
      return {
        searchFilterText: '',
      };
    },
    computed: {},
    methods: {},
    vuex: {
      getters: {
        facilityUsers: state => state.pageState.facilityUsers,
        isSuperuser,
      },
      actions: {},
    },
    $trs: {
      devicePermissionsHeader: 'Device Permissions',
      devicePermissionsDescription: 'Make changes to what users can manage on your device',
    },
  };

</script>


<style lang="stylus" scoped>

  .user-grid
    margin-top: 2em

</style>
