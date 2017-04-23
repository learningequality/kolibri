<template>

  <div>
    <div class="top-buttons pure-g">

      <div :class="windowSize.breakpoint > 2 ? 'pure-u-1-2' : 'pure-u-1-1 align-center'">
        <router-link :to="editClassLink">
          <icon-button
            :text="$tr('backToClassDetails')"
            :primary="false">
            <mat-svg category="navigation" name="arrow_back"/>
          </icon-button>
        </router-link>
      </div>

      <div :class="windowSize.breakpoint > 2 ? 'pure-u-1-2 align-right' : 'pure-u-1-1 align-center'">
        <icon-button
          :text="$tr('enrollSelectedUsers')"
          :primary="true"
          @click="openConfirmEnrollmentModal"
          :disabled="selectedUsers.length === 0">
        </icon-button>
      </div>

    </div>

    <confirm-enrollment-modal
      v-if="showConfirmEnrollmentModal"
      :className="className"
      :classId="classId"
      :selectedUsers="selectedUsers"/>

    <h1>{{ $tr('selectLearners') }} {{ className }}</h1>
    <h2 class="subheader-text">{{ $tr('showingAllUnassigned') }}</h2>

    <div class="toolbar">
      <div class="search-box" role="search">
        <mat-svg class="icon" category="action" name="search" aria-hidden="true"/>
        <input
          :aria-label="$tr('searchForUser')"
          type="search"
          v-model="filterInput"
          :placeholder="$tr('searchForUser')"
          @input="pageNum = 1">
      </div>
    </div>

    <ui-switch
      name="showSelectedUsers"
      :label="$tr('selectedUsers')"
      v-model="showSelectedUsers"
      class="switch"/>


    <p v-if="usersNotInClass.length === 0">{{ $tr('noUsersExist') }}</p>
    <p v-else-if="showSelectedUsers && filteredUsers.length === 0">{{ $tr('noUsersSelected') }}</p>
    <p v-else-if="filteredUsers.length === 0">{{ $tr('noUsersMatch') }} <strong>"{{ filterInput }}"</strong></p>

    <div v-else>
      <p class="results-text">
        {{ $tr('showing') }} <strong>{{ visibleStartRange }} - {{ visibleEndRange }}</strong>
        {{ $tr('of') }} {{$tr('numLearners', {count: numFilteredUsers}) }}
        <span v-if="filterInput">{{ $tr('thatMatch') }} <strong>"{{ filterInput }}"</strong></span>
      </p>

      <table>
        <thead>
        <tr>
          <th></th>
          <th>{{ $tr('username') }}</th>
          <th>
            <span class="visuallyhidden">{{ $tr('role') }}</span>
          </th>
          <th>{{ $tr('name') }}</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="learner in visibleFilteredUsers" :class="isSelected(learner.id) ? 'selectedrow' : ''"
            @click="toggleSelection(learner.id)">
          <td class="col-checkbox"><input type="checkbox" :id="learner.id" :value="learner.id" v-model="selectedUsers"></td>
          <th scope="col">{{ learner.username }}</th>
          <td class="col-role">
            <user-role :role="learner.kind" :omitLearner="true" />
          </td>
          <td><strong>{{ learner.full_name }}</strong></td>
        </tr>
        </tbody>
      </table>
    </div>


    <nav v-if="numPages > 1" class="pagination">
      <ui-icon-button
        type="secondary"
        color="default"
        icon="chevron_left"
        :ariaLabel="$tr('previousResults')"
        :disabled="pageNum === 1"
        size="small"
        @click="goToPage(pageNum - 1)"/>
      <icon-button
        v-for="page in numPages"
        :text="String(page)"
        :primary="false"
        :ariaLabel="`${$tr('goToPage')} ${page}`"
        :disabled="pageNum === page"
        size="small"
        @click="goToPage(page)"
        v-if="windowSize.breakpoint > 2 && pageWithinRange(page)"/>
      <ui-icon-button
        type="secondary"
        color="default"
        icon="chevron_right"
        :ariaLabel="$tr('nextResults')"
        :disabled="pageNum === numPages"
        size="small"
        @click="goToPage(pageNum + 1)"/>
    </nav>

    <hr>

    <div>
      <h2>{{ $tr('createAndEnroll') }}</h2>
      <p>{{ $tr('enrollSomeone') }}</p>

      <icon-button
        :text="$tr('createNewUser')"
        :primary="false"
        @click="openCreateUserModal">
        <mat-svg category="content" name="add"/>
      </icon-button>

      <user-create-modal
        v-if="showCreateUserModal"/>
    </div>
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
      enrollSelectedUsers: 'Enroll selected users',
      selectLearners: 'Choose users to enroll in',
      showingAllUnassigned: 'Showing all users not assigned to this class',
      searchForUser: 'Search for a user',
      createAndEnroll: 'Or: create & enroll a brand new user',
      enrollSomeone: `Enroll someone who isn't already a user`,
      createNewUser: 'Create a new user account',
      showing: 'Showing',
      of: 'of',
      numLearners: '{count, number, integer} {count, plural, one {User} other {Users}}',
      name: 'Name',
      username: 'Username',
      role: 'Role',
      selectedUsers: 'Only show selected users',
      noUsersExist: 'No users exist',
      noUsersSelected: 'No users are selected',
      noUsersMatch: 'No users match',
      thatMatch: 'that match',
      previousResults: 'Previous results',
      goToPage: 'Go to page',
      nextResults: 'Next results',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-checkbox': require('keen-ui/src/UiCheckbox'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
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
      goToPage(page) {
        this.pageNum = page;
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

  $toolbar-height = 36px

  .align-right
    text-align: right

  .align-center
    text-align: center

  .top-buttons
    position: relative

  .pagination
    text-align:center
    padding: 2em

  .subheader-text
    font-weight: normal

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

  .selectedrow
    background-color: $core-bg-canvas

  .col-checkbox
    width: 24px

  .results-text
    font-size: 0.9375rem

  // @jtamiace: All the following styles below apply to the search bar, and have been copied directly from user-page/index.vue
  // Will need to be refactored later

  .toolbar
    margin-top: 30px

  .toolbar:after
    content: ''
    display: table
    clear: both

  input[type='search']
    display: inline-block
    box-sizing: border-box
    position: relative
    top: 0
    left: 10px
    height: 100%
    width: 85%
    border-color: transparent
    background-color: transparent
    clear: both

  .search-box .icon
    display: inline-block
    float: left
    position: relative
    fill: $core-text-annotation
    left: 5px
    top: 5px

  .search-box
    border-radius: 5px
    padding: inherit
    border: 1px solid #c0c0c0
    max-width: 400px
    height: $toolbar-height
    float: left

  @media screen and (min-width: $portrait-breakpoint + 1)
    .search-box
      font-size: 0.9em
      min-width: 170px
      width: 45%
    #search-field
      width: 80%

  @media print
    .toolbar
      display: none

  @media screen and (max-width: 840px)
    .search-box
      font-size: 0.9em
      width: 100%
      margin-top: 5px
      float: right

</style>
