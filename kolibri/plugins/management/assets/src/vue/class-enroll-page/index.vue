<template>

  <div>
    <div>
      <icon-button
        :text="$tr('backToClassDetails')"
        :primary="false"
      >
        <mat-svg category="navigation" name="arrow_back"/>
      </icon-button>
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
          <th>{{$tr('enrolledClasses')}}</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="learner in filteredLearnerList">
          <td><ui-checkbox/></td>
          <td>{{learner.name}}</td>
          <td>{{learner.username}}</td>
          <td>{{learner.enrolledClasses}}</td>
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
      >
        <mat-svg category="content" name="add"/>
      </icon-button>
    </div>
  </div>

</template>


<script>

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
      enrolledClasses: 'Enrolled Classes',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-checkbox': require('keen-ui/src/UiCheckbox'),
      'textbox': require('kolibri.coreVue.components.textbox'),
    },
    data: () => ({
      filterInput: '',
      learnerList: [{}, {}],
      learnersPerPage: 10,
      currentPage: 1,
    }),
    computed: {
      filteredLearnerList() {
        return this.learnerList;
      },
      totalLearners() {
        return this.filteredLearnerList.length;
      },

      startRange() {
        return Math.min((1 + ((this.currentPage - 1) * this.learnersPerPage)), this.totalLearners);
      },

      endRange() {
        return Math.min((this.currentPage * this.learnersPerPage), this.totalLearners);
      },
    },
    vuex: {
      getters: {
        classId: state => state.pageState.classId,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
