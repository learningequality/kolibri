<template>

  <div>

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

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import authMessage from 'kolibri.coreVue.components.authMessage';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import userGrid from './user-grid';

  export default {
    name: 'deviceManagementPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      authMessage,
      kFilterTextbox,
      userGrid,
    },
    data() {
      return {
        searchFilterText: '',
      };
    },
    computed: {
      ...mapGetters(['isSuperuser']),
      ...mapState({
        facilityUsers: state => state.pageState.facilityUsers,
      }),
    },
    $trs: {
      devicePermissionsHeader: 'Device permissions',
      devicePermissionsDescription: 'Make changes to what users can manage on your device',
      searchPlaceholder: 'Search for a user...',
      documentTitle: 'Manage Device Permissions',
    },
  };

</script>


<style lang="scss" scoped>

  .description {
    margin-bottom: 2em;
  }

  .filter-box {
    margin-bottom: 1em;
    text-align: right;
  }

</style>
