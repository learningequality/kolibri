<template>

  <div>
    <!-- TODO convert to template for reusability w/in respective pages -->
    <div class="actions-header">
      <!-- TODO align right -->
      <k-filter-textbox
        :placeholder="$tr('searchForUser')"
        v-model.trim="filterInput"
        @input="pageNum = 1"
      />
    </div>

    <form @submit.prevent="$emit('submit', selectedUsers)">
      <user-table
        v-model="selectedUsers"
        :users="visibleFilteredUsers"
        :title="$tr('userTableLabel')"
        :selectable="true"
        :selectAllLabel="$tr('selectAllOnPage')"
        :userCheckboxLabel="$tr('selectUser')"
        :emptyMessage="$tr('noUsersMatch')"
      />

      <div class="pagination-footer">
        <span>
          {{ $tr('pagination', { visibleStartRange, visibleEndRange, numFilteredUsers }) }}
        </span>
        <nav>
          <ui-icon-button
            type="primary"
            :icon="isRtl? 'chevron_right' : 'chevron_left'"
            :ariaLabel="$tr('previousResults')"
            :disabled="pageNum === 1"
            size="small"
            @click="goToPage(pageNum - 1)"
          />
          <ui-icon-button
            type="primary"
            :icon="isRtl? 'chevron_left' : 'chevron_right'"
            :ariaLabel="$tr('nextResults')"
            :disabled="pageNum === numPages"
            size="small"
            @click="goToPage(pageNum + 1)"
          />
        </nav>
      </div>

      <!-- TODO align right -->
      <k-button
        :text="$tr('confirmSelectionButtonLabel')"
        :primary="true"
        type="submit"
        :disabled="selectedUsers.length === 0"
      />
    </form>


  </div>

</template>


<script>

  import { Modals } from './../constants';
  import differenceWith from 'lodash/differenceWith';
  // TODO move to higher level directory after string freeze
  import userTable from './class-edit-page/user-table';
  import kGrid from 'kolibri.coreVue.components.kGrid';
  import kGridItem from 'kolibri.coreVue.components.kGridItem';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import orderBy from 'lodash/orderBy';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';

  export default {
    name: 'managementClassEnroll',
    components: {
      kButton,
      kCheckbox,
      uiIconButton,
      kFilterTextbox,
      kGrid,
      kGridItem,
      userTable,
    },
    mixins: [responsiveWindow],
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
    data: () => ({
      filterInput: '',
      perPage: 10,
      pageNum: 1,
      selectedUsers: [],
    }),
    computed: {
      usersNotInClass() {
        return differenceWith(this.facilityUsers, this.classUsers, (a, b) => a.id === b.id);
      },
      filteredUsers() {
        const users = this.usersNotInClass;
        return users.filter(user => {
          const searchTerms = this.filterInput
            .split(' ')
            .filter(Boolean)
            .map(term => term.toLowerCase());
          const fullName = user.full_name.toLowerCase();
          const username = user.username.toLowerCase();
          return searchTerms.every(term => fullName.includes(term) || username.includes(term));
        });
      },
      sortedFilteredUsers() {
        return orderBy(
          this.filteredUsers,
          [user => user.username.toUpperCase(), user => user.full_name.toUpperCase()],
          ['asc', 'asc']
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
      showConfirmEnrollmentModal() {
        return this.modalShown === Modals.CONFIRM_ENROLLMENT;
      },
      emptyMessage() {
        if (this.usersNotInClass.length === 0) {
          return this.$tr('allUsersAlready');
        }
        if (this.facilityUsers.length === 0) {
          return this.$tr('noUsersExist');
        }
        if (this.filteredUsers.length === 0 && this.filterInput !== '') {
          // TODO internationalize this
          return `${this.$tr('noUsersMatch')}: '${this.filterInput}'`;
        }

        return '';
      },
    },
    methods: {
      reducePageNum() {
        while (this.visibleFilteredUsers.length === 0 && this.pageNum > 1) {
          this.pageNum = this.pageNum - 1;
        }
      },
      goToPage(page) {
        this.pageNum = page;
      },
      pageWithinRange(page) {
        const maxOnEachSide = 1;
        if (this.pageNum === 1 || this.pageNum === this.numPages) {
          return Math.abs(this.pageNum - page) <= maxOnEachSide + 1;
        }
        return Math.abs(this.pageNum - page) <= maxOnEachSide;
      },
    },
    vuex: {
      getters: {
        facilityUsers: state => state.pageState.facilityUsers,
        classUsers: state => state.pageState.classUsers,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  nav
    display: inline-block

  .actions-header
    text-align: right

  .pagination-footer
    text-align: right

</style>
