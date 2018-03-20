<template>

  <div>
    <!-- TODO convert to template for reusability w/in respective pages -->
    <confirm-enrollment-modal
      v-if="showConfirmEnrollmentModal"
      :className="className"
      :classId="classId"
      :selectedUsers="selectedUsers"
    />

    <h1>{{ $tr('selectLearners', { className }) }}</h1>
    <p>{{ $tr('showingAllUnassigned') }}</p>

    <p v-if="facilityUsers.length === 0">{{ $tr('noUsersExist') }}</p>

    <p v-else-if="usersNotInClass.length === 0">{{ $tr('allUsersAlready') }}</p>

    <div v-else>

      <div class="actions-header">
        <!-- TODO align right -->
        <k-filter-textbox
          class="filter"
          :class="{ 'invisible' : showSelectedUsers }"
          :placeholder="$tr('searchForUser')"
          v-model.trim="filterInput"
          @input="pageNum = 1"
        />
      </div>


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
    </div>

    <user-create-modal v-if="showCreateUserModal" />

    <!-- TODO align right -->
    <k-button
      :text="$tr('enrollSelectedUsers')"
      :primary="true"
      @click="openConfirmEnrollmentModal"
      :disabled="selectedUsers.length === 0"
    />


  </div>

</template>


<script>

  import { PageNames, Modals } from '../../constants';
  import { displayModal } from '../../state/actions';
  import differenceWith from 'lodash/differenceWith';
  // TODO move to higher level directory after string freeze
  import userTable from '../class-edit-page/user-table';
  import kGrid from 'kolibri.coreVue.components.kGrid';
  import kGridItem from 'kolibri.coreVue.components.kGridItem';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import orderBy from 'lodash/orderBy';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import uiIcon from 'keen-ui/src/UiIcon';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import userCreateModal from '../user-page/user-create-modal';
  import confirmEnrollmentModal from './confirm-enrollment-modal';
  import userRole from '../user-role';

  export default {
    name: 'managementClassEnroll',
    components: {
      kButton,
      kRouterLink,
      kCheckbox,
      uiIconButton,
      uiIcon,
      kFilterTextbox,
      kGrid,
      kGridItem,
      userCreateModal,
      confirmEnrollmentModal,
      userRole,
      userTable,
    },
    mixins: [responsiveWindow],
    $trs: {
      // TODO kill
      backToClassDetails: 'Back to class details',
      // TODO kill
      enrollSelectedUsers: 'Review & save',
      confirmSelectionButtonLabel: 'Confirm',
      selectLearners: 'Select users to enroll in {className}',
      showingAllUnassigned: 'Showing all users currently not enrolled in this class',
      searchForUser: 'Search for a user',
      createNewUser: 'New user account',
      userIconColumnHeader: 'User Icon',
      name: 'Full name',
      username: 'Username',
      userTableLabel: 'User List',
      selectedUsers: 'Show selected users',
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
      showSelectedUsers: false,
    }),
    computed: {
      isMobile() {
        return this.windowSize.breakpoint <= 3;
      },
      numCols() {
        return this.isMobile ? 1 : 2;
      },
      usersNotInClass() {
        return differenceWith(this.facilityUsers, this.classUsers, (a, b) => a.id === b.id);
      },
      usersNotInClassSelected() {
        return this.usersNotInClass.filter(user => this.selectedUsers.includes(user.id));
      },
      filteredUsers() {
        const users = this.showSelectedUsers ? this.usersNotInClassSelected : this.usersNotInClass;
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
      allVisibleFilteredUsersSelected() {
        return this.visibleFilteredUsers.every(visibleUser =>
          this.selectedUsers.includes(visibleUser.id)
        );
      },
      editClassLink() {
        return {
          name: PageNames.CLASS_EDIT_MGMT_PAGE,
          id: this.classId,
        };
      },
      showCreateUserModal() {
        return this.modalShown === Modals.CREATE_USER;
      },
      showConfirmEnrollmentModal() {
        return this.modalShown === Modals.CONFIRM_ENROLLMENT;
      },
      selectAllIsChecked() {
        return (
          this.allVisibleFilteredUsersSelected &&
          this.visibleFilteredUsers.length !== 0 &&
          !this.showSelectedUsers
        );
      },
      emptyMessage() {
        if (this.filteredUsers.length === 0 && this.filterInput !== '') {
          // TODO internationalize this
          return `${this.$tr('noUsersMatch')}: '${this.filterInput}'`;
        }
        return this.$tr('noUsersExist');
      },
    },
    watch: {
      // TODO to be removed
      userJustCreated(user) {
        this.selectedUsers.push(user.id);
      },
    },
    methods: {
      reducePageNum() {
        while (this.visibleFilteredUsers.length === 0 && this.pageNum > 1) {
          this.pageNum = this.pageNum - 1;
        }
      },
      isSelected(userId) {
        return this.selectedUsers.includes(userId);
      },
      toggleSelection(userId) {
        const index = this.selectedUsers.indexOf(userId);
        if (index === -1) {
          this.selectedUsers.push(userId);
        } else {
          this.selectedUsers.splice(index, 1);
        }
        this.reducePageNum();
      },
      toggleAllVisibleUsers(value) {
        if (value) {
          this.visibleFilteredUsers.forEach(visibleUser => {
            if (!this.selectedUsers.includes(visibleUser.id)) {
              this.selectedUsers.push(visibleUser.id);
            }
          });
        } else {
          this.visibleFilteredUsers.forEach(visibleUser => {
            this.selectedUsers = this.selectedUsers.filter(
              selectedUser => selectedUser !== visibleUser.id
            );
          });
        }
        this.reducePageNum();
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
      openCreateUserModal() {
        this.displayModal(Modals.CREATE_USER);
      },
      openConfirmEnrollmentModal() {
        this.displayModal(Modals.CONFIRM_ENROLLMENT);
      },
    },
    vuex: {
      getters: {
        classId: state => state.pageState.class.id,
        className: state => state.pageState.class.name,
        facilityUsers: state => state.pageState.facilityUsers,
        classUsers: state => state.pageState.classUsers,
        modalShown: state => state.pageState.modalShown,
        userJustCreated: state => state.pageState.userJustCreated,
      },
      actions: { displayModal },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .align-right
    text-align: right

  .align-center
    text-align: center

  .link-button
    text-decoration: none

  .top-buttons
    position: relative

  nav
    display: inline-block

  .pagination-footer
    text-align: right

  .inline-block
    display: inline-block

  .invisible
    visibility: hidden

  .row-enter-active, .row-leave-active
    transition: all 0.25s ease

  .row-enter, .row-leave-active
    opacity: 0
    transform: scale3d(1, 0.5, 1)

  .filter
    margin-right: 16px

  .va-m
    vertical-align: middle

</style>
