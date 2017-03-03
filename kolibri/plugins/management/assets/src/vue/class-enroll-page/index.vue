<template>

  <div>
    <div>
      <router-link :to="editClassLink">
        <icon-button
          :text="$tr('backToClassDetails')"
          :primary="false"
        >
          <mat-svg category="navigation" name="arrow_back"/>
        </icon-button>
      </router-link>
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
      >
        Are you sure you want to enroll the following students into Math 20A?
        <p v-for="learner in selectedLearners">{{ learner }}</p>

      </ui-confirm>
    </div>
    <div>
      <h1>{{ $tr('selectUsers') }}</h1>
      <p>{{ $tr('showingAllUnassigned') }}</p>
      <textbox
        :placeholder="$tr('searchByName')"
        :aria-label="$tr('searchByName')"
        v-model="filterInput"
        type="search"
      />
    </div>
    <div>
      <p>{{ $tr('showing') }} <strong>{{ visibleStartRange }} - {{ visibleEndRange }}</strong> {{ $tr('of') }} {{
        $tr('numLearners',
        {count: numFilteredItems}) }}</p>
      <table>
        <thead>
        <tr>
          <th></th>
          <th>{{$tr('name')}}</th>
          <th>{{$tr('username')}}</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="learner in visibleFilteredItems">
          <td>
            <input type="checkbox" :id="learner.id" :value="learner.id" v-model="selectedLearners">
          </td>
          <td>{{learner.full_name}}</td>
          <td>{{learner.username}}</td>
        </tr>
        </tbody>
      </table>
      <hr>

      <div>
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
      selectUsers: 'Select users to become learners',
      showingAllUnassigned: 'Showing all unassigned users from your user list',
      searchByName: 'Search by name',
      createAndEnroll: 'Optional: Create & enroll a brand new user',
      enrollSomeone: `Enroll someone who isn't on your user list`,
      createNewUser: 'Create a New User Account',
      showing: 'Showing',
      of: 'of',
      numLearners: '{count, number, integer} {count, plural, one {Learner} other {Learners}}',
      name: 'Name',
      username: 'Username',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-checkbox': require('keen-ui/src/UiCheckbox'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'textbox': require('kolibri.coreVue.components.textbox'),
      'user-create-modal': require('../user-page/user-create-modal'),
      'ui-confirm': require('keen-ui/src/UiConfirm'),
    },
    data: () => ({
      filterInput: '',
      perPage: 10,
      pageNum: 1,
      selectedLearners: [],
      createUserModalOpen: false,
      sortByName: true,
      sortAscending: true,
    }),
    computed: {
      itemsNotInCLass() {
        return differenceWith(this.learnerList, this.classroomUsers, (a, b) => a.id === b.id);
      },
      filteredItems() {
        // apply filter
        return this.itemsNotInCLass;
      },
      sortedFilteredItems() {
        return this.filteredItems.sort((a, b) => {
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
      numFilteredItems() {
        return this.sortedFilteredItems.length;
      },
      numPages() {
        return Math.ceil(this.numFilteredItems / this.perPage);
      },
      startRange() {
        return (this.pageNum - 1) * this.perPage;
      },
      visibleStartRange() {
        return Math.min(this.startRange + 1, this.numFilteredItems);
      },
      endRange() {
        return this.pageNum * this.perPage;
      },
      visibleEndRange() {
        return Math.min(this.endRange, this.numFilteredItems);
      },
      visibleFilteredItems() {
        return this.sortedFilteredItems.slice(this.startRange, this.endRange);
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
          console.log(username);
          this.selectedLearners.push(this.getUserId(this.learnerList, username));
        }
      },
      getUserId(learnerList, username) {
        return learnerList.find(learner => learner.username === username).id;
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
    },
    vuex: {
      getters: {
        classId: state => state.pageState.classroom.id,
        learnerList: state => state.pageState.facilityUsers,
        classroomUsers: state => state.pageState.clasroomUsers,
      },
      actions: {
        enrollUsersInClass: actions.enrollUsersInClass,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
