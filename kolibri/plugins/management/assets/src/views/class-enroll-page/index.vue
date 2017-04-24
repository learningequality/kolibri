<template>

  <div>
    <div class="top-buttons pure-g">

      <div :class="windowSize.breakpoint > 2 ? 'pure-u-1-2' : 'pure-u-1-1 align-center'">
        <router-link :to="editClassLink" class="link-button">
          <icon-button
            :text="$tr('backToClassDetails')"
            :primary="false">
            <mat-svg category="navigation" name="arrow_back"/>
          </icon-button>
        </router-link>
      </div>

      <div :class="windowSize.breakpoint > 2 ? 'pure-u-1-2 align-right' : 'pure-u-1-1 align-center'">
        <icon-button
          :text="$tr('createNewUser')"
          :primary="false"
          @click="openCreateUserModal"
        />
        <icon-button
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
      :selectedUsers="selectedUsers"/>

    <h1>{{ $tr('selectLearners') }} {{ className }}</h1>
    <p>{{ $tr('showingAllUnassigned') }}</p>

    <p v-if="facilityUsers.length === 0">{{ $tr('noUsersExist') }}</p>

    <p v-else-if="usersNotInClass.length === 0">{{ $tr('allUsersAlready') }}</p>

    <div v-else>

      <div class="actions-header pure-g">

        <div :class="[windowSize.breakpoint <= 3 ? 'pure-u-1-1' : 'pure-u-3-4', showSelectedUsers ? 'invisible' : '']">
          <ui-icon
            :aria-label="$tr('search')"
            icon="search"
          />
          <textbox
            :aria-label="$tr('searchForUser')"
            v-model.trim="filterInput"
            type="search"
            :placeholder="$tr('searchForUser')"
            @input="pageNum = 1"
            ref="searchbox"
            class="inline-block"
            />
          <ui-icon-button
            type="secondary"
            icon="clear"
            :class="filterInput === '' ? 'invisible' : ''"
            @click="$refs.searchbox.reset()"
          />
        </div>
        <div :class="[windowSize.breakpoint > 3 ? 'pure-u-1-4' : 'pure-u-1-1', filterInput === '' ? '' : 'invisible']">
          <ui-switch
            name="showSelectedUsers"
            :label="`${$tr('selectedUsers')} (${selectedUsers.length})`"
            v-model="showSelectedUsers"
            class="switch"
          />
        </div>
      </div>

      <table>
        <thead>
        <tr>
          <th>
            <ui-checkbox
              :name="$tr('selectAllOnPage')"
              :value="allVisibleFilteredUsersSelected && visibleFilteredUsers.length !== 0"
              :disabled="visibleFilteredUsers.length === 0"
              @change="selectAllVisibleUsers"
              class="inline-block"
              />
          </th>
          <th>{{ $tr('name') }}</th>
          <th>{{ $tr('username') }}</th>
          <th>
            <span class="visuallyhidden">{{ $tr('role') }}</span>
          </th>
          <th>{{ $tr('name') }}</th>
        </tr>
        </thead>

        <tbody>
        <p v-if="showSelectedUsers && filteredUsers.length === 0">{{ $tr('noUsersSelected') }}</p>
        <p v-else-if="filterInput !== '' && filteredUsers.length === 0">{{ $tr('noUsersMatch') }} <strong>"{{ filterInput }}"</strong></p>
        <tr v-else v-for="learner in visibleFilteredUsers" :class="isSelected(learner.id) ? 'selectedrow' : ''"
            @click="toggleSelection(learner.id)">
          <td class="col-checkbox">
            <ui-checkbox
              :name="$tr('selectUser')"
              :value="isSelected(learner.id)"
              @change="toggleSelection(learner.id)"
              class="inline-block"
              />
          </td>
          <th scope="col">{{ learner.username }}</th>
          <td class="col-role">
            <user-role :role="learner.kind" :omitLearner="true" />
          </td>
          <td><strong>{{ learner.full_name }}</strong></td>
        </tr>
        </tbody>
      </table>

      <div class="pagination-footer">
        {{ visibleStartRange }} - {{ visibleEndRange }} {{ $tr('of') }} {{ numFilteredUsers }}
        <nav>
          <ui-icon-button
            type="primary"
            icon="chevron_left"
            :ariaLabel="$tr('previousResults')"
            :disabled="pageNum === 1"
            size="small"
            @click="goToPage(pageNum - 1)"/>
          <ui-icon-button
            type="primary"
            icon="chevron_right"
            :ariaLabel="$tr('nextResults')"
            :disabled="pageNum === numPages"
            size="small"
            @click="goToPage(pageNum + 1)"/>
        </nav>
      </div>
    </div>

    <user-create-modal v-if="showCreateUserModal"/>

  </div>

</template>


<script>

  const constants = require('../../constants');
  const actions = require('../../state/actions');
  const differenceWith = require('lodash/differenceWith');
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  module.exports = {
    mixins: [responsiveWindow],
    $trNameSpace: 'managementClassEnroll',
    $trs: {
      backToClassDetails: 'Back to class details',
      enrollSelectedUsers: 'Review & save',
      selectLearners: 'Select users to enroll in',
      showingAllUnassigned: 'Showing all users currently not enrolled in this class',
      searchForUser: 'Search for a user',
      createNewUser: 'New user account',
      of: 'of',
      name: 'Name',
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
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-checkbox': require('keen-ui/src/UiCheckbox'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'ui-icon': require('keen-ui/src/UiIcon'),
      'textbox': require('kolibri.coreVue.components.textbox'),
      'user-create-modal': require('../user-page/user-create-modal'),
      'confirm-enrollment-modal': require('./confirm-enrollment-modal'),
      'ui-switch': require('keen-ui/src/UiSwitch'),
      'user-role': require('../user-role'),
    },
    data: () => ({
      filterInput: '',
      perPage: 10,
      pageNum: 1,
      selectedUsers: [],
      sortByName: true,
      sortAscending: true,
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
          const searchTerms =
            this.filterInput.split(' ').filter(Boolean).map(term => term.toLowerCase());
          const fullName = user.full_name.toLowerCase();
          const username = user.username.toLowerCase();
          return searchTerms.every(term => fullName.includes(term) || username.includes(term));
        });
      },
      sortedFilteredUsers() {
        return this.filteredUsers.sort((a, b) => {
          if (this.sortAscending && this.sortByName) {
            return a.full_name.localeCompare(b.full_name);
          } else if (this.sortAscending && !this.sortByName) {
            return a.username.localeCompare(b.username);
          } else if (!this.sortAscending && this.sortByName) {
            return b.full_name.localeCompare(a.full_name);
          }
          return b.username.localeCompare(a.username);
        });
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
        return this.visibleFilteredUsers.every(
          visibleUser => this.selectedUsers.includes(visibleUser.id));
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
    methods: {
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
      },
      selectAllVisibleUsers(value) {
        if (value) {
          this.visibleFilteredUsers.forEach(visibleUser => {
            if (!this.selectedUsers.includes(visibleUser.id)) {
              this.selectedUsers.push(visibleUser.id);
            }
          });
        } else {
          this.visibleFilteredUsers.forEach(visibleUser => {
            this.selectedUsers = this.selectedUsers.filter(
              selectedUser => selectedUser !== visibleUser.id);
          });
        }
      },
      goToPage(page) {
        this.pageNum = page;
      },
      pageWithinRange(page) {
        const maxOnEachSide = 1;
        if (this.pageNum === 1 || this.pageNum === this.numPages) {
          return Math.abs(this.pageNum - page) <= (maxOnEachSide + 1);
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
    watch: {
      userJustCreated(user) {
        this.selectedUsers.push(user.id);
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
      actions: {
        displayModal: actions.displayModal,
      },
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

  $table-row-selected = #e0e0e0
  $table-row-hover = #eee

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
    color: #686868
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

</style>
