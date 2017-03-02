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
        {count: totalItems}) }}</p>
      <table>
        <thead>
        <tr>
          <th></th>
          <th>{{$tr('name')}}</th>
          <th>{{$tr('username')}}</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="learner in paginatedLearnerList">
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
        />
        <icon-button
          v-for="page in totalPages"
          :text="String(page)"
          :primary="false"
          :disabled="pageNum === page"
          @click="goTo(page)"
        />
        <ui-icon-button
          type="secondary"
          color="default"
          icon="chevron_right"
          ariaLabel="Next results"
          :disabled="pageNum === totalPages"
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
    },
    data: () => ({
      filterInput: '',
      perPage: 10,
      pageNum: 1,
      totalItems: 0,
      totalPages: 0,
      startRange: 0,
      endRange: 0,
      selectedLearners: [],
      createUserModalOpen: false,
    }),
    computed: {
      editClassLink() {
        return {
          name: constants.PageNames.CLASS_EDIT_MGMT_PAGE,
          id: this.classId,
        };
      },
      filteredLearnerList() {
        // apply filter
        return this.learnerList;
      },
      paginatedLearnerList() {
        const paginatedObj =
          this.getPaginatedItems(this.filteredLearnerList, this.pageNum, this.perPage);
        this.totalItems = paginatedObj.totalItems;
        this.totalPages = paginatedObj.totalPages;
        this.startRange = paginatedObj.startRange;
        this.endRange = paginatedObj.endRange;
        return paginatedObj.paginatedItems;
      },
    },
    methods: {
      openCreateUserModal() {
        this.createUserModalOpen = true;
        // console.log(this.getPaginatedItems(this.learnerList, 4, 10));
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
        const startRange = Math.min(start + 1, totalItems);
        const endRange = Math.min(end, totalItems);
        return {
          pageNum,
          perPage,
          totalItems,
          totalPages,
          paginatedItems,
          totalPaginatedItems,
          startRange,
          endRange,
        };
      },
      goTo(page) {
        this.pageNum = page;
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
