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
          @click="$refs.confirmation.open()"
          :disabled="selectedUsers.length === 0">
          <mat-svg category="navigation" name="check"/>
        </icon-button>
      </div>

    </div>

    <ui-confirm
      ref="confirmation"
      @confirm="enrollLearners"
      :closeOnConfirm="false"
      :title="$tr('confirmEnrollment')"
      :confirmButtonText="$tr('yesEnrollUsers')"
      :denyButtonText="$tr('noGoBack')">
      {{ $tr('areYouSure') }} <strong>{{ className }}</strong>?
      <ul>
        <li v-for="userId in selectedUsers"><strong>{{ getUsername(userId) }}</strong></li>
      </ul>
    </ui-confirm>


    <h1>{{ $tr('selectLearners') }} {{ className }}</h1>
    <p>{{ $tr('showingAllUnassigned') }}</p>

    <textbox
      :placeholder="$tr('searchForUser')"
      :aria-label="$tr('searchForUser')"
      v-model="filterInput"
      type="search"
      @input="pageNum = 1"
      class="search-box"/>

    <ui-switch
      name="showSelectedUsers"
      :label="$tr('selectedUsers')"
      v-model="showSelectedUsers"
      class="switch"/>

    <hr>


    <p v-if="usersNotInClass.length === 0">{{ $tr('noUsersExist') }}</p>
    <p v-else-if="showSelectedUsers && filteredUsers.length === 0">{{ $tr('noUsersSelected') }}</p>
    <p v-else-if="filteredUsers.length === 0">{{ $tr('noUsersMatch') }} <strong>"{{ filterInput }}"</strong></p>

    <div v-else>
      <p>
        {{ $tr('showing') }} <strong>{{ visibleStartRange }} - {{ visibleEndRange }}</strong>
        {{ $tr('of') }} {{$tr('numLearners', {count: numFilteredUsers}) }}
        <span v-if="filterInput">{{ $tr('thatMatch') }} <strong>"{{ filterInput }}"</strong></span>
      </p>

      <table>
        <thead>
        <tr>
          <th></th>
          <th>{{ $tr('name') }}</th>
          <th>{{ $tr('username') }}</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="learner in visibleFilteredUsers" :class="isSelected(learner.id) ? 'selectedrow' : ''"
            @click="toggleSelection(learner.id)">
          <td class="col-checkbox"><input type="checkbox" :id="learner.id" :value="learner.id" v-model="selectedUsers"></td>
          <td class="col-name"><strong>{{ learner.full_name }}</strong></td>
          <td class="col-username">{{ learner.username }}</td>
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
        @click="goToPage(pageNum - 1)"/>
      <icon-button
        v-for="page in numPages"
        :text="String(page)"
        :primary="false"
        :ariaLabel="`${$tr('goToPage')} ${page}`"
        :disabled="pageNum === page"
        @click="goToPage(page)"
        v-if="windowSize.breakpoint > 2 && pageWithinRange(page)"/>
      <ui-icon-button
        type="secondary"
        color="default"
        icon="chevron_right"
        :ariaLabel="$tr('nextResults')"
        :disabled="pageNum === numPages"
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
        v-if="createUserModalOpen"
        @close="closeCreateUserModal"/>
    </div>
  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const actions = require('../../actions');
  const differenceWith = require('lodash.differencewith');
  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  module.exports = {
    mixins: [responsiveWindow],
    $trNameSpace: 'management-class-enroll',
    $trs: {
      backToClassDetails: 'Back to class details',
      enrollSelectedUsers: 'Enroll selected users',
      selectLearners: 'Select users to enroll in',
      showingAllUnassigned: 'Showing all users not assigned to this class',
      searchForUser: 'Search for a user',
      createAndEnroll: 'Or: Create & enroll a brand new user',
      enrollSomeone: `Enroll someone who isn't already a user`,
      createNewUser: 'Create a new user account',
      showing: 'Showing',
      of: 'of',
      numLearners: '{count, number, integer} {count, plural, one {User} other {Users}}',
      name: 'Name',
      username: 'Username',
      selectedUsers: 'Only show selected users',
      areYouSure: 'Are you sure you want to enroll the following users into',
      confirmEnrollment: 'Confirm Enrollment of Selected Users',
      noUsersExist: 'No users exist',
      noUsersSelected: 'No users are selected',
      noUsersMatch: 'No users match',
      thatMatch: 'that match',
      yesEnrollUsers: 'Yes, enroll students',
      noGoBack: 'No, go back',
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
      'ui-confirm': require('keen-ui/src/UiConfirm'),
      'ui-switch': require('keen-ui/src/UiSwitch'),
    },
    data: () => ({
      filterInput: '',
      perPage: 10,
      pageNum: 1,
      selectedUsers: [],
      createUserModalOpen: false,
      sortByName: true,
      sortAscending: true,
      showSelectedUsers: false,
    }),
    computed: {
      usersNotInClass() {
        return differenceWith(this.facilityUsers, this.classroomUsers, (a, b) => a.id === b.id);
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
    },
    methods: {
      goToPage(page) {
        this.pageNum = page;
      },
      openCreateUserModal() {
        this.createUserModalOpen = true;
      },
      closeCreateUserModal(username) {
        this.createUserModalOpen = false;
        if (username) {
          this.selectedUsers.push(this.getUserId(username));
        }
      },
      enrollLearners() {
        this.enrollUsersInClass(this.classId, this.selectedUsers).then(
          () => {
            this.$refs.confirmation.close();
            this.$router.push(this.editClassLink);
          },
          (error) => {
            console.log(error);
          });
      },
      getUserId(username) {
        return this.facilityUsers.find(learner => learner.username === username).id;
      },
      getUsername(userId) {
        return this.facilityUsers.find(user => user.id === userId).username;
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
    },
    vuex: {
      getters: {
        classId: state => state.pageState.classroom.id,
        className: state => state.pageState.classroom.name,
        facilityUsers: state => state.pageState.facilityUsers,
        classroomUsers: state => state.pageState.clasroomUsers,
      },
      actions: {
        enrollUsersInClass: actions.enrollUsersInClass,
      },
    },
  };

</script>


<style lang="stylus">

  .switch
    .ui-switch__track
      z-index: 0

    .ui-switch__thumb
      z-index: 1

</style>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .align-right
    text-align: right

  .align-center
    text-align: center

  .top-buttons
    position: relative

  .pagination
    text-align:center
    padding: 2em

  .search-box
    max-width: 400px

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
    width: 10%

  .col-name, .col-username
    width: 45%

</style>
