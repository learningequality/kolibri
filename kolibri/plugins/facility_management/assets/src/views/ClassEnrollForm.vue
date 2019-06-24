<template>

  <form @submit.prevent="$emit('submit', selectedUsers)">
    <div class="actions-header">
      <KFilterTextbox
        v-model.trim="filterInput"
        :placeholder="$tr('searchForUser')"
        @input="pageNum = 1"
      />
    </div>

    <h2>{{ $tr('userTableLabel') }}</h2>

    <UserTable
      v-model="selectedUsers"
      :users="visibleFilteredUsers"
      :selectable="true"
      :selectAllLabel="$tr('selectAllOnPage')"
      :userCheckboxLabel="$tr('selectUser')"
      :emptyMessage="emptyMessage"
    />

    <nav>
      <span dir="auto" class="pagination-label">
        {{ $tr('pagination', { visibleStartRange, visibleEndRange, numFilteredUsers }) }}
      </span>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('previousResults')"
        :disabled="pageNum === 1"
        size="small"
        class="pagination-button"
        @click="goToPage(pageNum - 1)"
      >
        <KIcon icon="back" style="position: relative; top: -1px;" />
      </UiIconButton>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('nextResults')"
        :disabled="pageNum === 0 || pageNum === numPages"
        size="small"
        class="pagination-button"
        @click="goToPage(pageNum + 1)"
      >
        <KIcon icon="forward" style="position: relative; top: -1px;" />
      </UiIconButton>
    </nav>

    <div class="footer">
      <KButton
        :text="coreCommon$tr('confirmAction')"
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
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import { userMatchesFilter, filterAndSortUsers } from '../userSearchUtils';
  import UserTable from './UserTable';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';

  export default {
    name: 'ClassEnrollForm',
    components: {
      KButton,
      KIcon,
      UiIconButton,
      KFilterTextbox,
      UserTable,
    },
    mixins: [coreStringsMixin, responsiveWindow],
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
        filterInput: '',
        perPage: 10,
        pageNum: 1,
        selectedUsers: [],
      };
    },
    computed: {
      usersNotInClass() {
        return differenceWith(this.facilityUsers, this.classUsers, (a, b) => a.id === b.id);
      },
      sortedFilteredUsers() {
        return filterAndSortUsers(this.usersNotInClass, user =>
          userMatchesFilter(user, this.filterInput)
        );
      },
      numFilteredUsers() {
        return this.sortedFilteredUsers.length;
      },
      numPages() {
        return Math.ceil(this.numFilteredUsers / this.perPage);
      },
      startRange() {
        return (this.pageNum - 1) * this.perPage;
      },
      visibleStartRange() {
        return Math.min(this.startRange + 1, this.numFilteredUsers);
      },
      endRange() {
        return this.pageNum * this.perPage;
      },
      visibleEndRange() {
        return Math.min(this.endRange, this.numFilteredUsers);
      },
      visibleFilteredUsers() {
        return this.sortedFilteredUsers.slice(this.startRange, this.endRange);
      },
      emptyMessage() {
        if (this.facilityUsers.length === 0) {
          return this.$tr('noUsersExist');
        }
        if (this.usersNotInClass.length === 0) {
          return this.$tr('allUsersAlready');
        }
        if (this.sortedFilteredUsers.length === 0 && this.filterInput !== '') {
          // TODO internationalize this
          return `${this.$tr('noUsersMatch')}: '${this.filterInput}'`;
        }

        return '';
      },
    },
    methods: {
      goToPage(page) {
        this.pageNum = page;
      },
    },
    $trs: {
      searchForUser: 'Search for a user',
      userIconColumnHeader: 'User Icon',
      name: 'Full name',
      username: 'Username',
      userTableLabel: 'User List',
      role: 'Role',
      // TODO clarify empty state messages after string freeze
      noUsersExist: 'No users exist',
      noUsersSelected: 'No users are selected',
      noUsersMatch: 'No users match',
      previousResults: 'Previous results',
      nextResults: 'Next results',
      selectAllOnPage: 'Select all on page',
      allUsersAlready: 'All users are already enrolled in this class',
      search: 'Search',
      selectUser: 'Select user',
      pagination:
        '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredUsers, number }',
    },
  };

</script>


<style lang="scss" scoped>

  .actions-header,
  .footer,
  nav {
    text-align: end;
  }
  .pagination-button {
    margin-left: 8px;
  }

</style>
