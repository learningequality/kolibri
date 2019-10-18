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
        :label="coreString('showAction')"
        :options="filterOptions"
        :inline="true"
      />
      <CoreTable :emptyMessage="emptyMessage">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('titleLabel') }}</th>
            <th style="position:relative;">
              {{ coachString('avgScoreLabel') }}
              <AverageScoreTooltip />
            </th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('recipientsLabel') }}</th>
            <th></th>
          </tr>
        </thead>
        <transition-group slot="tbody" tag="tbody" name="list">
          <tr v-for="tableRow in table" :key="tableRow.id">
            <td>
              <KLabeledIcon icon="quiz">
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
            <td class="status">
              <!-- Open quiz button -->
              <KButton
                v-if="!tableRow.active && !tableRow.archive"
                :text="$tr('openQuizLabel')"
                appearance="flat-button"
                @click="showOpenConfirmationModal = true; modalQuizId=tableRow.id"
              />
              <!-- Close quiz button -->
              <KButton
                v-if="tableRow.active && !tableRow.archive"
                :text="$tr('closeQuizLabel')"
                appearance="flat-button"
                @click="showCloseConfirmationModal = true; modalQuizId=tableRow.id;"
              />
              <!-- Toggle visibility -->
              <KSwitch
                v-if="tableRow.archive"
                name="toggle-quiz-visibility"
                :checked="tableRow.active"
                :value="tableRow.active"
                :label="$tr('reportVisibleLabel')"
                style="margin: 0.5rem;"
                @change="handleToggleVisibility(tableRow.id, tableRow.active)"
              />
            </td>
          </tr>
        </transition-group>
      </CoreTable>
      <!-- Modals for Close & Open of quiz from right-most column -->
      <QuizStatusModal
        v-if="showOpenConfirmationModal"
        :modalHeader="$tr('openQuizLabel')"
        :modalDetail="$tr('openQuizModalDetail')"
        @cancel="showOpenConfirmationModal = false"
        @submit="handleOpenQuiz(modalQuizId)"
      />
      <QuizStatusModal
        v-if="showCloseConfirmationModal"
        :modalHeader="$tr('closeQuizLabel')"
        :modalDetail="$tr('closeQuizModalDetail')"
        @cancel="showCloseConfirmationModal = false"
        @submit="handleCloseQuiz(modalQuizId)"
      />
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ExamResource } from 'kolibri.resources';
  import commonCoach from '../common';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsQuizListPage',
    components: {
      ReportsHeader,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        filter: 'allQuizzes',
        showOpenConfirmationModal: false,
        showCloseConfirmationModal: false,
        modalQuizId: null,
      };
    },
    computed: {
      emptyMessage() {
        if (this.filter.value === 'allQuizzes') {
          return this.coachString('quizListEmptyState');
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
            label: this.coachString('allQuizzesLabel'),
            value: 'allQuizzes',
            noActiveExams: 'No active quizzes',
            noInactiveExams: 'No inactive quizzes',
          },
          {
            label: this.coachString('activeQuizzesLabel'),
            value: 'activeQuizzes',
          },
          {
            label: this.coachString('inactiveQuizzesLabel'),
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
    methods: {
      handleOpenQuiz(quizId) {
        let promise = ExamResource.saveModel({
          id: quizId,
          data: {
            active: true,
            date_activated: new Date(),
          },
          exists: true,
        });

        return promise
          .then(() => {
            this.$store.dispatch('classSummary/refreshClassSummary');
            this.showOpenConfirmationModal = false;
            this.$store.dispatch('createSnackbar', this.$tr('quizOpenedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.$tr('quizFailedToOpenMessage'));
          });
      },
      handleCloseQuiz(quizId) {
        let promise = ExamResource.saveModel({
          id: quizId,
          data: {
            archive: true,
            date_archived: new Date(),
          },
          exists: true,
        });

        return promise
          .then(() => {
            this.$store.dispatch('classSummary/refreshClassSummary');
            this.showCloseConfirmationModal = false;
            this.$store.dispatch('createSnackbar', this.$tr('quizClosedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.$tr('quizFailedToCloseMessage'));
          });
      },
      handleToggleVisibility(quizId, isActive) {
        const newActiveState = !isActive;
        const snackbarMessage = newActiveState
          ? this.$tr('quizVisibleToLearners')
          : this.$tr('quizNotVisibleToLearners');

        let promise = ExamResource.saveModel({
          id: quizId,
          data: {
            active: newActiveState,
          },
          exists: true,
        });

        return promise.then(() => {
          this.$store.dispatch('classSummary/refreshClassSummary');
          this.showOpenConfirmationModal = false;
          this.$store.dispatch('createSnackbar', snackbarMessage);
        });
      },
    },
    $trs: {
      noActiveExams: 'No active quizzes',
      noInactiveExams: 'No inactive quizzes',
      reportVisibleLabel: {
        message: 'Report visible',
        context:
          'A label used on a switch indicating that the learners can see their reports when the switch is turned "on"',
      },
      quizOpenedMessage: {
        message: 'Quiz is open',
        context:
          'A brief snackbar message notifying the user that the quiz was successfully opened.',
      },
      quizFailedToOpenMessage: {
        message: 'There was a problem opening the quiz. The quiz was not opened.',
        context:
          'A brief snackbar message notifying the user that there was an error trying to open the quiz and that the quiz is not open.',
      },
      quizClosedMessage: {
        message: 'Quiz is closed',
        context:
          'A brief snackbar message notifying the user that the quiz was successfully closed.',
      },
      quizFailedToCloseMessage: {
        message: 'There was a problem closing the quiz. The quiz was not closed.',
        context:
          'A brief snackbar message notifying the user that there was an error trying to close the quiz and that the quiz is not closed.',
      },
      quizVisibleToLearners: {
        message: 'Quiz report is visible to learners',
        context:
          'A brief snackbar message notifying the user that learners may view their quiz report. It will show when the user changes a setting to make the quiz visible.',
      },
      quizNotVisibleToLearners: {
        message: 'Quiz report is not visible to learners',
        context:
          'A brief snackbar message notifying the user that learners may no longer view their quiz report. It will show when the user changes a setting to make the quiz no longer visible.',
      },
      openQuizLabel: {
        message: 'Open quiz',
        context:
          "Label for a button that, when clicked, will 'open' a quiz - making it active so that Learners may take the quiz.",
      },
      openQuizModalDetail: {
        message:
          'Opening the quiz will make it visible to learners and they will be able to answer questions',
        context:
          "Text shown on a modal pop-up window when the user clicks the 'Open Quiz' button. This explains what will happen when the user confirms the action of opening the quiz.",
      },
      closeQuizLabel: {
        message: 'Close quiz',
        context:
          "Label for a button that, when clicked, will 'close' a quiz. This makes the quiz inactive and Learners will no longer be able to give answers.",
      },
      closeQuizModalDetail: {
        message:
          'All learners will be given a final score and a quiz report. Unfinished questions will be counted as incorrect.',
        context:
          "Text shown on a modal pop-up window when the user clicks the 'Close Quiz' button. This explains what will happen when the modal window is confirmed.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  td.status {
    padding-top: 0;
    padding-bottom: 0;
  }

</style>
