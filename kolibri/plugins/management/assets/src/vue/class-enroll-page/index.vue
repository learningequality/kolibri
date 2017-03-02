<template>

  <div>
    <div>
      <router-link :to="editClassPage">
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
      />
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
      <p>{{ $tr('showing') }} <strong>{{ startRange }} - {{ endRange }}</strong> {{ $tr('of') }} {{ $tr('numLearners',
        {count: totalLearners}) }}</p>
      <table>
        <thead>
        <tr>
          <th></th>
          <th>{{$tr('name')}}</th>
          <th>{{$tr('username')}}</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="learner in filteredLearnerList">
          <td>
            <input type="checkbox" :id="learner.id" :value="learner.id" v-model="selectedLearners">
          </td>
          <td>{{learner.full_name}}</td>
          <td>{{learner.username}}</td>
        </tr>
        </tbody>
      </table>
      <hr>
      <div>pagination</div>

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
      'textbox': require('kolibri.coreVue.components.textbox'),
      'user-create-modal': require('../user-page/user-create-modal'),
    },
    data: () => ({
      filterInput: '',
      perPage: 10,
      currentPage: 1,
      selectedLearners: [],
      createUserModalOpen: false,
    }),
    computed: {
      editClassPage() {
        return {
          name: constants.PageNames.CLASS_EDIT_MGMT_PAGE,
          id: this.classId,
        };
      },
      filteredLearnerList() {
        return this.learnerList;
      },

      totalLearners() {
        return this.filteredLearnerList.length;
      },

      startRange() {
        return Math.min((1 + ((this.currentPage - 1) * this.perPage)), this.totalLearners);
      },

      endRange() {
        return Math.min((this.currentPage * this.perPage), this.totalLearners);
      },
    },
    methods: {
      openCreateUserModal() {
        this.createUserModalOpen = true;
      },
      closeCreateUserModal() {
        this.createUserModalOpen = false;
      },
      getPaginatedItems(items, pageNum, perPage) {
        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / perPage);
        const start = (pageNum - 1) * perPage;
        const end = pageNum * perPage;
        const paginatedItems = items.slice(start, end);
        const totalPaginatedItems = paginatedItems.length;
        return {
          pageNum,
          perPage,
          totalItems,
          totalPages,
          paginatedItems,
          totalPaginatedItems,
        };
      },
    },
    vuex: {
      getters: {
        classId: state => state.pageState.classId,
        learnerList: state => state.pageState.users,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
