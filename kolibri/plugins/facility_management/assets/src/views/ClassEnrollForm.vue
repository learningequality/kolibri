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
          :emptyMessage="emptyMessageForItems(items, filterInput)"
        />
      </template>
    </PaginatedListContainer>

    <div class="footer">
      <KButton
        :text="coreString('confirmAction')"
        :primary="true"
        type="submit"
        :disabled="selectedUsers.length === 0"
      />
    </div>

  </form>

</template>


<script>

  import differenceWith from 'lodash/differenceWith';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import { userMatchesFilter, filterAndSortUsers } from '../userSearchUtils';
  import UserTable from './UserTable';

  export default {
    name: 'ClassEnrollForm',
    components: {
      PaginatedListContainer,
      UserTable,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
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
          return this.coreString('noUsersExistLabel');
        }
        if (this.usersNotInClass.length === 0) {
          return this.$tr('allUsersAlready');
        }
        if (items.length === 0 && filterInput !== '') {
          return this.$tr('noUsersMatch', { filterText: filterInput });
        }

        return '';
      },
    },
    $trs: {
      searchForUser: 'Search for a user',
      // TODO clarify empty state messages after string freeze
      noUsersMatch: 'No users match the filter: "{filterText}"',
      allUsersAlready: 'All users are already enrolled in this class',
    },
  };

</script>


<style lang="scss" scoped>

  .footer {
    text-align: end;
  }

</style>
