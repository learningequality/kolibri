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
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KRouterLink
                :text="tableRow.title"
                :to="classRoute('ReportsQuizLearnerListPage', { quizId: tableRow.id })"
              />
            </td>
            <td>
              <Placeholder :ready="false">
                <Score />
              </Placeholder>
            </td>
            <td>
              <LearnerProgressRatio
                :count="tableRow.numStarted + tableRow.numCompleted"
                :verbosity="1"
                :icon="ICONS.clock"
                :total="tableRow.totalLearners"
                :verb="VERBS.started"
              />
            </td>
            <td><Recipients :groups="tableRow.groupNames" /></td>
            <td>
              <QuizActive :active="tableRow.active" />
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
          const { started, notStarted, completed } = this.counts(exam);
          const total = this.dataHelpers.learnersForGroups(exam.groups).length;
          const tableRow = {
            totalLearners: total,
            numCompleted: completed,
            numStarted: started,
            numNotStarted: notStarted,
            groupNames: this.dataHelpers.groupNames(exam.groups),
          };
          Object.assign(tableRow, exam);
          return tableRow;
        });
        return mapped;
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    methods: {
      counts(exam) {
        const learners = this.dataHelpers.learnersForGroups(exam.groups);
        const statuses = learners.map(learnerId =>
          this.dataHelpers.examStatusForLearner(exam.id, learnerId)
        );
        const completed = statuses.filter(status => status === this.STATUSES.completed).length;
        const started = statuses.filter(status => status === this.STATUSES.started).length;
        const notStarted = statuses.filter(status => status === this.STATUSES.notStarted).length;
        return { completed, started, notStarted };
      },
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
