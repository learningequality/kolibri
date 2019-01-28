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
      <KSelect
        v-model="filter"
        :label="$tr('show')"
        :options="filterOptions"
        :inline="true"
      />
      <CoreTable>
        <thead slot="thead">
          <tr>
            <td>{{ coachStrings.$tr('titleLabel') }}</td>
            <td>{{ coachStrings.$tr('avgScoreLabel') }}</td>
            <td>{{ coachStrings.$tr('progressLabel') }}</td>
            <td>{{ coachStrings.$tr('recipientsLabel') }}</td>
            <td>{{ coachStrings.$tr('statusLabel') }}</td>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="examObj in table" :key="examObj.id">
            <td>
              <KRouterLink
                :text="examObj.title"
                :to="classRoute('ReportsQuizLearnerListPage', { quizId: examObj.id })"
              />
            </td>
            <td>
              <Placeholder :ready="false">
                <Score />
              </Placeholder>
            </td>
            <td>
              <Placeholder :ready="false">
                <LearnerProgressRatio
                  :count="0"
                  :verbosity="1"
                  icon="nothing"
                  :total="examObj.totalLearners"
                  verb="started"
                />
              </Placeholder>
            </td>
            <td><Recipients :groups="examObj.groupNames" /></td>
            <td>
              <QuizActive :active="examObj.active" />
            </td>
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
    name: 'ReportsQuizListPage',
    components: {
      ReportsHeader,
    },
    mixins: [commonCoach],
    data() {
      return {
        filter: 'allQuizzes',
      };
    },
    computed: {
      ...mapGetters('classSummary', ['exams']),
      filterOptions() {
        return [
          {
            label: this.$tr('allQuizzes'),
            value: 'allQuizzes',
          },
          {
            label: this.$tr('activeQuizzes'),
            value: 'activeQuizzes',
          },
          {
            label: this.$tr('inactiveQuizzes'),
            value: 'inactiveQuizzes',
          },
        ];
      },
      table() {
        const filtered = this.exams.filter(exam => {
          if (this.filter.value === 'allQuizzes') {
            return true;
          } else if (this.filter.value === 'activeQuizzes') {
            return exam.active;
          } else if (this.filter.value === 'inactiveQuizzes') {
            return !exam.active;
          }
        });
        const sorted = this.dataHelpers.sortBy(filtered, ['title', 'active']);
        const mapped = sorted.map(exam => {
          const augmentedObj = {
            totalLearners: this.dataHelpers.learnersForGroups(exam.groups).length,
            groupNames: this.dataHelpers.groupNames(exam.groups),
          };
          Object.assign(augmentedObj, exam);
          return augmentedObj;
        });
        return mapped;
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    $trs: {
      show: 'Show',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
