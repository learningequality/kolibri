<template>

  <div>
    <div>
      <div class="top-buttons">
        <div class="pure-u-1-2">
        <router-link :to="editClassLink">
          <icon-button
            :text="$tr('backToClassDetails')"
            :primary="false"
          >
            <mat-svg category="navigation" name="arrow_back"/>
          </icon-button>
        </router-link>
        </div>
        <div class="pure-u-1-2">
          <icon-button
            :text="$tr('reviewAndSave')"
            :primary="true"
            @click="$refs.confirmation.open()"
            :disabled="selectedLearners.length === 0"
          />
          <ui-confirm
            ref="confirmation"
            @confirm="enrollLearners"
            :closeOnConfirm="false"
            title="Confirm Enrollment of Selected Students"
            confirmButtonText="Yes, Enroll Users"
            denyButtonText="No, Go Back"
          >
            {{ $tr('areYouSure') }} <strong>{{ className }}</strong>?
            <ul>
              <li v-for="userId in selectedLearners"><strong>{{ getUsername(userId) }}</strong></li>
            </ul>
          </ui-confirm>
        </div>
      </div>
    </div>
    <div>
      <h1>{{ $tr('selectLearners') }} {{ className }}</h1>
      <p>{{ $tr('showingAllUnassigned') }}</p>

      <ui-switch
      name="showSelectedUsers"
      :label="$tr('selectedUsers')"
      v-model="showSelectedUsers"
      class="switch"
      />

      <textbox
        :placeholder="$tr('searchByName')"
        :aria-label="$tr('searchByName')"
        v-model="filterInput"
        type="search"
      />
    </div>
    <div>
      <p>
        {{ $tr('showing') }} <strong>{{ visibleStartRange }} - {{ visibleEndRange }}</strong>
        {{ $tr('of') }} {{$tr('numLearners', {count: numFilteredUsers}) }}
        <span v-if="filterInput">for <strong>"{{ filterInput }}"</strong></span>
      </p>
      <table>
        <thead>
        <tr>
          <th></th>
          <th>{{$tr('name')}}</th>
          <th>{{$tr('username')}}</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="learner in visibleFilteredUsers">
          <td>
            <input type="checkbox" :id="learner.id" :value="learner.id" v-model="selectedLearners">
          </td>
          <td><strong>{{learner.full_name}}</strong></td>
          <td>{{learner.username}}</td>
        </tr>
        </tbody>
      </table>
      <hr>

      <div v-if="numPages > 1">
        <ui-icon-button
          type="secondary"
          color="default"
          icon="chevron_left"
          ariaLabel="Previous results"
          :disabled="pageNum === 1"
          @click="goToPage(pageNum - 1)"
        />
        <icon-button
          v-for="page in numPages"
          :text="String(page)"
          :primary="false"
          :disabled="pageNum === page"
          @click="goToPage(page)"
        />
        <ui-icon-button
          type="secondary"
          color="default"
          icon="chevron_right"
          ariaLabel="Next results"
          :disabled="pageNum === numPages"
          @click="goToPage(pageNum + 1)"
        />
      </div>
    </div>

    <div>
      <h2>{{ $tr('createAndEnroll') }}</h2>
      <p>{{ $tr('enrollSomeone') }}</p>
      <hr>
      <icon-button
        :text="$tr('createNewUser')"
        :primary="false"
        @click="openCreateUserModal"
      >
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

  module.exports = {
    $trNameSpace: 'management-class-enroll',
    $trs: {
      backToClassDetails: 'Back to class details',
      reviewAndSave: 'Review & Save',
      selectLearners: 'Select users to enroll in',
      showingAllUnassigned: 'Showing all users not assigned to this class',
      searchByName: 'Search for a user',
      createAndEnroll: 'Optional: Create & enroll a brand new user',
      enrollSomeone: `Enroll someone who isn't on your user list`,
      createNewUser: 'Create a New User Account',
      showing: 'Showing',
      of: 'of',
      numLearners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      name: 'Name',
      username: 'Username',
      allUsers: 'All Users',
      selectedUsers: 'Show Selected Users',
      areYouSure: 'Are you sure you want to enroll the following students into',
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
      selectedLearners: [],
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
        return this.usersNotInClass.filter(user => this.selectedLearners.includes(user.id));
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
          this.selectedLearners.push(this.getUserId(username));
        }
      },
      enrollLearners() {
        this.enrollUsersInClass(this.classId, this.selectedLearners).then(
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

  table
    width: 100%
    word-break: break-all


  th
    text-align: left

  .top-buttons
    position: relative

</style>
