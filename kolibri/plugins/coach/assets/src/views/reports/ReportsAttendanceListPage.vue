<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer>
      <ReportsHeader />
      <!-- TODO COACH
      <KCheckbox :label="coachStrings.$tr('viewByGroupsLabel')" />
      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
       -->
      <KSelect
        v-model="groupFilter"
        :label="$tr('show')"
        :options="groupFilterOptions"
        :inline="true"
      />
      <KFilterTextbox
        v-model="searchFilter"
        :placeholder="$tr('searchText')"
        class="learner-filter "
      />
      <CoreTable :emptyMessage="coachStrings.$tr('learnerListEmptyState')">
        <thead slot="thead">
          <tr>
            <th>{{ coachStrings.$tr('usernameLabel') }}</th>
            <th>{{ coachStrings.$tr('fullNameLabel') }}</th>
            <th>{{ coachStrings.$tr('statusLabel') }}</th>
            <th>{{ coachStrings.$tr('lastLoggedInLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" person />
                <KRouterLink
                  :text="tableRow.username"
                  :to="classRoute('ReportsLearnerReportPage', { learnerId: tableRow.id })"
                />
              </KLabeledIcon>
            </td>
            <td>{{ tableRow.name }}</td>
            <td><LessonActive :active="tableRow.active" /></td>
            <td>{{ tableRow.lastLoggedIn }}</td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { localeCompare } from 'kolibri.utils.i18n';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import commonCoach from '../common';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsAttendanceListPage',
    components: {
      ReportsHeader,
      KFilterTextbox,
    },
    $trs: {
      show: 'Show',
      allGroups: 'All groups',
      activeLessons: 'Active lessons',
      inactiveLessons: 'Inactive lessons',
      searchText: 'Filter by username or full name',
    },
    mixins: [commonCoach],
    data() {
      return {
        groupFilter: 'allGroups',
        searchFilter: '',
      };
    },
    computed: {
      table() {
        const filteredByGroup = this.filterByGroup(this.learners);
        const filtered = this.filterByUsername(filteredByGroup);
        const sorted = this._.sortBy(filtered, ['username']);
        const mapped = sorted.map(learner => {
          const augmentedObj = {
            active: this.active(learner),
            lastLoggedIn: this.lastLoggedIn(learner),
          };
          Object.assign(augmentedObj, learner);
          return augmentedObj;
        });
        return mapped;
      },
      groupFilterOptions() {
        const groupFilterOptions = [
          {
            label: this.$tr('allGroups'),
            value: this.$tr('allGroups'),
          },
        ];
        this.groups.forEach(group => {
          groupFilterOptions.push({
            label: group.name,
            value: group.id,
          });
        });
        return groupFilterOptions;
      },
    },
    beforeMount() {
      this.groupFilter = this.groupFilterOptions[0];
    },
    methods: {
      active(learner) {
        return this.activeLearners.includes(learner.username);
      },
      lastLoggedIn(learner) {
        if (!this.active(learner)) {
          for (let i = 0; i < this.learnersInfo.length; i++) {
            if (this.learnersInfo[i].user__username == learner.username) {
              const lastLoggedInDate = new Date(
                this.learnersInfo[i].last_interaction_timestamp__max
              );
              return lastLoggedInDate.toDateString();
            }
          }
          return this.coachStrings.$tr('neverLoggedInLabel');
        }
      },
      filterByGroup(learners) {
        const groupFilterValue = this.groupFilter.value;
        if (groupFilterValue === this.$tr('allGroups')) {
          return learners;
        } else {
          const learnerIdsInGroup = this.groups.find(group => {
            return group.id === groupFilterValue;
          }).member_ids;
          return learners.filter(learner => learnerIdsInGroup.includes(learner.id));
        }
      },
      filterByUsername(learners) {
        const sortByKey = 'username';
        const predicate = learner => this.learnerMatchesFilter(learner, this.searchFilter);
        return learners.filter(predicate).sort((a, b) => {
          return localeCompare(a[sortByKey], b[sortByKey]);
        });
      },
      learnerMatchesFilter(learner, searchFilter) {
        const searchTerms = searchFilter.split(/\s+/).map(val => val.toLowerCase());
        const fullName = learner.name.toLowerCase();
        const username = learner.username.toLowerCase();
        return searchTerms.every(term => fullName.includes(term) || username.includes(term));
      },
    },
  };

</script>


<style lang="scss" scoped>

  .learner-filter {
    margin-bottom: 14px;
  }

</style>
