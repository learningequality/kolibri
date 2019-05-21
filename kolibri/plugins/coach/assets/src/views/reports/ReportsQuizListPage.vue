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
            <th>{{ coachStrings.$tr('titleLabel') }}</th>
            <th>{{ coachStrings.$tr('avgScoreLabel') }}</th>
            <th>{{ coachStrings.$tr('progressLabel') }}</th>
            <th>{{ coachStrings.$tr('recipientsLabel') }}</th>
            <th>{{ coachStrings.$tr('statusLabel') }}</th>
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

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import commonCoach from '../common';
  import CoachExamsPage from '../plan/CoachExamsPage';
  import ReportsHeader from './ReportsHeader';

  const CoachExamsPageStrings = crossComponentTranslator(CoachExamsPage);

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
          return this.coachStrings.$tr('quizListEmptyState');
        }
        if (this.filter.value === 'activeQuizzes') {
          return CoachExamsPageStrings.$tr('noActiveExams');
        }
        if (this.filter.value === 'inactiveQuizzes') {
          return CoachExamsPageStrings.$tr('noInactiveExams');
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
        const mapped = sorted.map(exam => {
          const learnersForQuiz = this.getLearnersForGroups(exam.groups);
          const tableRow = {
            totalLearners: learnersForQuiz.length,
            tally: this.getExamStatusTally(exam.id, learnersForQuiz),
            groupNames: this.getGroupNames(exam.groups),
            avgScore: this.getExamAvgScore(exam.id, learnersForQuiz),
            hasAssignments: exam.assignments.length > 0,
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
    $trs: {
      show: 'Show',
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped></style>
