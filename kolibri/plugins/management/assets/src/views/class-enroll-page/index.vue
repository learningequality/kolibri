<template>

  <div>
    <div class="top-buttons pure-g">

      <div :class="windowSize.breakpoint > 2 ? 'pure-u-1-2' : 'pure-u-1-1 align-center'">
        <k-router-link
          :text="$tr('backToClassDetails')"
          :to="editClassLink"
          :primary="false"
          appearance="flat-button"
          class="link-button"
        />
      </div>

      <div :class="windowSize.breakpoint > 2 ? 'pure-u-1-2 align-right' : 'pure-u-1-1 align-center'">
        <k-button
          :text="$tr('createNewUser')"
          :primary="false"
          @click="openCreateUserModal"
        />
        <k-button
          :text="$tr('enrollSelectedUsers')"
          :primary="true"
          @click="openConfirmEnrollmentModal"
          :disabled="selectedUsers.length === 0"
        />
      </div>

    </div>

    <confirm-enrollment-modal
      v-if="showConfirmEnrollmentModal"
      :className="className"
      :classId="classId"
      :selectedUsers="selectedUsers" />

    <h1>{{ $tr('selectLearners', { className }) }}</h1>
    <p>{{ $tr('showingAllUnassigned') }}</p>

    <p v-if="facilityUsers.length === 0">{{ $tr('noUsersExist') }}</p>

    <p v-else-if="usersNotInClass.length === 0">{{ $tr('allUsersAlready') }}</p>

    <div v-else>

      <div class="actions-header">

        <k-filter-textbox
          class="filter"
          :class="{ 'invisible' : showSelectedUsers }"
          :placeholder="$tr('searchForUser')"
          v-model.trim="filterInput"
          @input="pageNum = 1"
        />
        <div class="inline-block">
          <ui-switch
            name="showSelectedUsers"
            :class="{ 'invisible' : filterInput }"
            :label="`${$tr('selectedUsers')} (${selectedUsers.length})`"
            v-model="showSelectedUsers"
            class="switch"
            @input="pageNum = 1"
          />
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="col-checkbox">
              <k-checkbox
                :label="$tr('selectAllOnPage')"
                :showLabel="false"
                :checked="allVisibleFilteredUsersSelected && visibleFilteredUsers.length !== 0 && !showSelectedUsers"
                :disabled="visibleFilteredUsers.length === 0 || showSelectedUsers"
                @change="toggleAllVisibleUsers"
                class="inline-block check"
              />
            </th>
            <th class="col-username">{{ $tr('username') }}</th>
            <th class="col-role">{{ $tr('role') }}</th>
            <th class="col-name">{{ $tr('name') }}</th>
          </tr>
        </thead>

        <tbody name="row" is="transition-group">
          <tr
            v-for="learner in visibleFilteredUsers"
            :class="isSelected(learner.id) ? 'selectedrow' : ''"
            @click="toggleSelection(learner.id)"
            :key="learner.id"
          >
            <td class="col-checkbox">
              <k-checkbox
                :label="$tr('selectUser')"
                :showLabel="false"
                :checked="isSelected(learner.id)"
                @change="toggleSelection(learner.id)"
                class="inline-block check"
                @click.native.stop
              />
            </td>
            <th class="col-username">{{ learner.username }}</th>
            <td class="col-role">{{ learner.kind }}</td>
            <td class="col-name">{{ learner.full_name }}</td>
          </tr>
        </tbody>
      </table>

      <p v-if="filteredUsers.length === 0 && showSelectedUsers">{{ $tr('noUsersSelected') }}</p>
      <p v-if="filteredUsers.length === 0 && filterInput !== ''">{{ $tr('noUsersMatch') }} <strong>"{{ filterInput }}"</strong></p>

      <div class="pagination-footer">
        <span>{{ $tr('pagination', { visibleStartRange, visibleEndRange, numFilteredUsers }) }}</span>
        <nav>
          <ui-icon-button
            type="primary"
            :icon="isRtl? 'chevron_right' : 'chevron_left'"
            :ariaLabel="$tr('previousResults')"
            :disabled="pageNum === 1"
            size="small"
            @click="goToPage(pageNum - 1)" />
          <ui-icon-button
            type="primary"
            :icon="isRtl? 'chevron_left' : 'chevron_right'"
            :ariaLabel="$tr('nextResults')"
            :disabled="pageNum === numPages"
            size="small"
            @click="goToPage(pageNum + 1)" />
        </nav>
      </div>
    </div>

    <user-create-modal v-if="showCreateUserModal" />

  </div>

</template>


<script>

  import * as constants from '../../constants';
  import * as actions from '../../state/actions';
  import differenceWith from 'lodash/differenceWith';
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
  import uiSwitch from 'keen-ui/src/UiSwitch';
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
      userCreateModal,
      confirmEnrollmentModal,
      uiSwitch,
      userRole,
    },
    mixins: [responsiveWindow],
    $trs: {
      backToClassDetails: 'Back to class details',
      enrollSelectedUsers: 'Review & save',
      selectLearners: 'Select users to enroll in {className}',
      showingAllUnassigned: 'Showing all users currently not enrolled in this class',
      searchForUser: 'Search for a user',
      createNewUser: 'New user account',
      name: 'Full name',
      username: 'Username',
      selectedUsers: 'Show selected users',
      role: 'Role',
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
          name: constants.PageNames.CLASS_EDIT_MGMT_PAGE,
          id: this.classId,
        };
      },
      showCreateUserModal() {
        return this.modalShown === constants.Modals.CREATE_USER;
      },
      showConfirmEnrollmentModal() {
        return this.modalShown === constants.Modals.CONFIRM_ENROLLMENT;
      },
    },
    watch: {
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
        this.displayModal(constants.Modals.CREATE_USER);
      },
      openConfirmEnrollmentModal() {
        this.displayModal(constants.Modals.CONFIRM_ENROLLMENT);
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
      actions: { displayModal: actions.displayModal },
    },
  };

</script>


<style lang="stylus">

  .switch
    margin-top: 20px
    .ui-switch__track
      z-index: 0

    .ui-switch__thumb
      z-index: 1

</style>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // based on material design data table spec
  $table-row-selected = #F5F5F5
  $table-row-hover = #EEEEEE

  .align-right
    text-align: right

  .align-center
    text-align: center

  .link-button
    text-decoration: none

  .top-buttons
    position: relative

  table
    width: 100%
    word-break: break-all

  th
    text-align: left

  td, th
    padding: 0.5em


  thead
    color: $core-text-annotation
    font-size: small

  tbody
    tr
      cursor: pointer
      &:hover
        background-color: $table-row-hover

  .selectedrow
    background-color: $table-row-selected

  .col-checkbox
    width: 24px

  nav
    display: inline-block

  .pagination-footer
    text-align: right

  .inline-block
    display: inline-block

  .invisible
    visibility: hidden

  .check
    margin-bottom: 0

  .row-enter-active, .row-leave-active
    transition: all 0.25s ease

  .row-enter, .row-leave-active
    opacity: 0
    transform: scale3d(1, 0.5, 1)

  .filter
    margin-right: 16px

</style>
