<template>

  <CoreBase
    :immersivePage="false"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <div class="new-coach-block">
      <ReportsHeader />
      <KCheckbox :label="coachStrings.$tr('viewByGroupsLabel')" />
      <h2>{{ coachStrings.$tr('overallLabel') }}</h2>
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('nameLabel') }}</td>
            <td>{{ coachStrings.$tr('groupsLabel') }}</td>
            <td>{{ coachStrings.$tr('avgQuizScoreLabel') }}</td>
            <td>{{ coachStrings.$tr('lessonsAssignedLabel') }}</td>
            <td>{{ coachStrings.$tr('exercisesCompletedLabel') }}</td>
            <td>{{ coachStrings.$tr('resourcesViewedLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KRouterLink
                :text="tableRow.name"
                :to="classRoute('ReportsLearnerReportPage', { learnerId: tableRow.id })"
              />
            </td>
            <td><TruncatedItemList :items="tableRow.groups" /></td>
            <td><Placeholder><Score :value="0.8" /></Placeholder></td>
            <td><Placeholder>{{ coachStrings.$tr('integer', {value: 3}) }}</Placeholder></td>
            <td><Placeholder>{{ coachStrings.$tr('integer', {value: 4}) }}</Placeholder></td>
            <td><Placeholder>{{ coachStrings.$tr('integer', {value: 5}) }}</Placeholder></td>
          </tr>
        </transition-group>
      </CoreTable>
    </div>
  </CoreBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoach from '../common';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsLearnerListPage',
    components: {
      ReportsHeader,
    },
    mixins: [commonCoach],
    computed: {
      ...mapGetters('classSummary', ['learners', 'groups']),
      table() {
        const sorted = this.dataHelpers.sortBy(this.learners, ['name']);
        const mapped = sorted.map(learner => {
          const groupNames = this.dataHelpers.groupNames(
            this.dataHelpers.map(
              this.groups.filter(group => group.member_ids.includes(learner.id)),
              'id'
            )
          );

          const augmentedObj = {
            groups: groupNames,
            avgScore: undefined,
            lessons: undefined,
            exercises: undefined,
            resources: undefined,
          };
          Object.assign(augmentedObj, learner);
          return augmentedObj;
        });
        return mapped;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
