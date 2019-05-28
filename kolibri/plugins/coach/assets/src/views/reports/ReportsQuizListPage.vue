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
      <KSelect
        v-model="filter"
        :label="$tr('show')"
        :options="filterOptions"
        :inline="true"
      />
      <CoreTable :emptyMessage="emptyMessage">
        <thead slot="thead">
          <tr>
            <th>{{ common$tr('titleLabel') }}</th>
            <th>{{ common$tr('avgScoreLabel') }}</th>
            <th>{{ common$tr('progressLabel') }}</th>
            <th>{{ common$tr('recipientsLabel') }}</th>
            <th>{{ common$tr('statusLabel') }}</th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon>
                <KIcon slot="icon" quiz />
                <KRouterLink
                  :text="tableRow.title"
                  :to="classRoute('ReportsQuizLearnerListPage', { quizId: tableRow.id })"
                />
              </KLabeledIcon>
            </td>
            <td>
              <Score :value="tableRow.avgScore" />
            </td>
            <td>
              <StatusSummary
                :tally="tableRow.tally"
                :verbose="true"
              />
            </td>
            <td>
              <Recipients
                :groupNames="tableRow.groupNames"
                :hasAssignments="tableRow.hasAssignments"
              />
            </td>
            <td>
              <QuizActive :active="tableRow.active" />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoach from '../common';
  import CoachExamsPage from '../plan/CoachExamsPage';
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
      emptyMessage() {
        if (this.filter.value === 'allQuizzes') {
          return this.common$tr('quizListEmptyState');
        }
        if (this.filter.value === 'activeQuizzes') {
          return this.$tr('noActiveExams');
        }
        if (this.filter.value === 'inactiveQuizzes') {
          return this.$tr('noInactiveExams');
        }

        return '';
      },
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
        const sorted = this._.sortBy(filtered, ['title', 'active']);
        return sorted.map(exam => {
          const learnersForQuiz = this.getLearnersForExam(exam);
          const tableRow = {
            totalLearners: learnersForQuiz.length,
            tally: this.getExamStatusTally(exam.id, learnersForQuiz),
            groupNames: this.getGroupNames(exam.groups),
            avgScore: this.getExamAvgScore(exam.id, learnersForQuiz),
            hasAssignments: learnersForQuiz.length > 0,
          };
          Object.assign(tableRow, exam);
          return tableRow;
        });
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
      noActiveExams: 'No active quizzes',
      noInactiveExams: 'No inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
