<template>

  <subpage-container>

      <auth-message v-if="!isSuperuser" authorizedRole="superuser" />

      <div v-else>
        <div>
          <div class="one-half">
            <h1>{{ $tr('devicePermissionsHeader') }}</h1>
            <p>{{ $tr('devicePermissionsDescription') }}</p>
          </div>
          <div class="one-half">
            <search-bar class="search" v-model="searchFilterText" />
          </div>
        </div>

        <user-grid class="user-grid" :searchFilter="searchFilterText" />
      </div>

  </subpage-container>

</template>


<script>

  import authMessage from 'kolibri.coreVue.components.authMessage';
  import { isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import searchBar from './search-bar';
  import userGrid from './user-grid';
  import subpageContainer from '../containers/subpage-container';

  export default {
    name: 'deviceManagementPage',
    components: {
      authMessage,
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

  .one-half
    display: inline-block
    width: 50%

  .search
    float: right

</style>
