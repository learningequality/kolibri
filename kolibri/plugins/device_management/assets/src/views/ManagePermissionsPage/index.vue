<template>

  <div>

    <AuthMessage v-if="!isSuperuser" authorizedRole="superuser" />

    <div v-else>
      <div class="description">
        <h1>{{ $tr('devicePermissionsHeader') }}</h1>
        <p>{{ $tr('devicePermissionsDescription') }}</p>
      </div>

      <div class="filter-box">
        <KFilterTextbox
          v-model="searchFilterText"
          :placeholder="$tr('searchPlaceholder')"
        />
      </div>

      <UserGrid :searchFilter="searchFilterText" />
    </div>

  </div>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import AuthMessage from 'kolibri.coreVue.components.AuthMessage';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import UserGrid from './UserGrid';

  export default {
    name: 'ManagePermissionsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AuthMessage,
      KFilterTextbox,
      UserGrid,
    },
    data() {
      return {
        searchFilterText: '',
      };
    },
    computed: {
      ...mapGetters(['isSuperuser']),
      ...mapState('managePermissions', ['facilityUsers']),
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
