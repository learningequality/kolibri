<template>

  <div>

    <div class="description">
      <h1>{{ coreString('devicePermissionsLabel') }}</h1>
      <p>{{ $tr('devicePermissionsDescription') }}</p>
    </div>

    <PaginatedListContainer
      :items="facilityUsers"
      :filterFunction="filterUsers"
      :filterPlaceholder="$tr('searchPlaceholder')"
    >
      <template v-slot:default="{items, filterInput}">
        <UserGrid
          :searchFilter="searchFilterText"
          :facilityUsers="items"
          :userPermissions="userPermissions"
          :filterText="filterInput"
        />
      </template>
    </PaginatedListContainer>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import { userMatchesFilter, filterAndSortUsers } from '../../userSearchUtils';
  import UserGrid from './UserGrid';

  export default {
    name: 'ManagePermissionsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      PaginatedListContainer,
      UserGrid,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        searchFilterText: '',
      };
    },
    computed: {
      ...mapState('managePermissions', {
        facilityUsers: state => state.facilityUsers,
        userPermissions: state => userid => state.permissions[userid],
      }),
    },
    methods: {
      filterUsers(users, filterText) {
        return filterAndSortUsers(users, user => userMatchesFilter(user, filterText));
      },
    },
    $trs: {
      devicePermissionsDescription: 'Make changes to what users can manage on your device',
      searchPlaceholder: 'Search for a user…',
      documentTitle: 'Manage Device Permissions',
    },
  };

</script>


<style lang="scss" scoped>

  .description {
    margin-bottom: 2em;
  }

</style>
