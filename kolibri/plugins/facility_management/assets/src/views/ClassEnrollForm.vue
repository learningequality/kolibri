<template>

  <form @submit.prevent="$emit('submit', selectedUsers)">

    <PaginatedListContainer
      :items="usersNotInClass"
      :filterFunction="filterUsers"
      :filterPlaceholder="$tr('searchForUser')"
    >
      <template v-slot:default="{items, filterInput}">
        <UserTable
          v-model="selectedUsers"
          :users="items"
          :selectable="true"
          :selectAllLabel="$tr('selectAllOnPage')"
          :userCheckboxLabel="$tr('selectUser')"
          :emptyMessage="emptyMessageForItems(items, filterInput)"
        />
      </template>
    </PaginatedListContainer>

    <div class="footer">
      <KButton
        :text="$tr('confirmSelectionButtonLabel')"
        :primary="true"
        type="submit"
        :disabled="selectedUsers.length === 0"
      />
    </div>

  </form>

</template>


<script>

  import differenceWith from 'lodash/differenceWith';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KButton from 'kolibri.coreVue.components.KButton';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import { userMatchesFilter, filterAndSortUsers } from '../userSearchUtils';
  import UserTable from './UserTable';

  export default {
    name: 'ClassEnrollForm',
    components: {
      KButton,
      PaginatedListContainer,
      UserTable,
    },
    mixins: [responsiveWindow],
    props: {
      facilityUsers: {
        type: Array,
        required: true,
      },
      classUsers: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        selectedUsers: [],
      };
    },
    computed: {
      usersNotInClass() {
        return differenceWith(this.facilityUsers, this.classUsers, (a, b) => a.id === b.id);
      },
    },
    methods: {
      filterUsers(users, filterText) {
        return filterAndSortUsers(users, user => userMatchesFilter(user, filterText));
      },
      emptyMessageForItems(items, filterInput) {
        if (this.facilityUsers.length === 0) {
          return this.$tr('noUsersExist');
        }
        if (this.usersNotInClass.length === 0) {
          return this.$tr('allUsersAlready');
        }
        if (items.length === 0 && filterInput !== '') {
          return this.$tr('noUsersExist', { filterText: filterInput });
        }

        return '';
      },
    },
    $trs: {
      confirmSelectionButtonLabel: 'Confirm',
      searchForUser: 'Search for a user',
      userIconColumnHeader: 'User Icon',
      name: 'Full name',
      username: 'Username',
      userTableLabel: 'User List',
      role: 'Role',
      // TODO clarify empty state messages after string freeze
      noUsersExist: 'No users exist',
      noUsersSelected: 'No users are selected',
      noUsersMatch: 'No users match the filter: "{filterText}"',
      selectAllOnPage: 'Select all on page',
      allUsersAlready: 'All users are already enrolled in this class',
      search: 'Search',
      selectUser: 'Select user',
    },
  };

</script>


<style lang="scss" scoped>

  .footer {
    text-align: end;
  }

</style>
