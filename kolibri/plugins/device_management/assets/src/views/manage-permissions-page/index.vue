<template>

  <subpage-container :withSideMargin="false">

    <auth-message v-if="!isSuperuser" authorizedRole="superuser" />

    <div v-else>
      <div class="description">
        <h1>{{ $tr('devicePermissionsHeader') }}</h1>
        <p>{{ $tr('devicePermissionsDescription') }}</p>
      </div>

      <div class="filter-box">
        <k-filter-textbox
          v-model="searchFilterText"
          :placeholder="$tr('searchPlaceholder')"
        />
      </div>

      <user-grid :searchFilter="searchFilterText" />
    </div>

  </subpage-container>

</template>


<script>

  import authMessage from 'kolibri.coreVue.components.authMessage';
  import { isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import subpageContainer from '../containers/subpage-container';
  import userGrid from './user-grid';

  export default {
    name: 'deviceManagementPage',
    components: {
      authMessage,
      kFilterTextbox,
      subpageContainer,
      userGrid,
    },
    data() {
      return {
        searchFilterText: '',
      };
    },
    vuex: {
      getters: {
        facilityUsers: state => state.pageState.facilityUsers,
        isSuperuser,
      },
    },
    $trs: {
      devicePermissionsHeader: 'Device permissions',
      devicePermissionsDescription: 'Make changes to what users can manage on your device',
      searchPlaceholder: 'Search for a user...',
    },
  };

</script>


<style lang="stylus" scoped>

  .description
    margin-bottom: 2em

  .filter-box
    text-align: right
    margin-bottom: 1em

</style>
