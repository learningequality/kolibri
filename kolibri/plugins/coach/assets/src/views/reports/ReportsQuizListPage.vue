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
                :text="coachString('openQuizLabel')"
                appearance="flat-button"
                @click="showOpenConfirmationModal = true; modalQuizId=tableRow.id"
              />
              <!-- Close quiz button -->
              <KButton
                v-if="tableRow.active && !tableRow.archive"
                :text="coachString('closeQuizLabel')"
                appearance="flat-button"
                @click="showCloseConfirmationModal = true; modalQuizId=tableRow.id;"
              />
              <!-- Toggle visibility -->
              <KSwitch
                v-if="tableRow.archive"
                name="toggle-quiz-visibility"
                :checked="tableRow.active"
                :value="tableRow.active"
                :label="coachString('reportVisibleLabel')"
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
        :modalHeader="coachString('openQuizLabel')"
        :modalDetail="coachString('openQuizModalDetail')"
        @cancel="showOpenConfirmationModal = false"
        @submit="handleOpenQuiz(modalQuizId)"
      />
      <QuizStatusModal
        v-if="showCloseConfirmationModal"
        :modalHeader="coachString('closeQuizLabel')"
        :modalDetail="coachString('closeQuizModalDetail')"
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
            this.$store.dispatch('createSnackbar', this.coachString('quizOpenedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.coachString('quizFailedToOpenMessage'));
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
            this.$store.dispatch('createSnackbar', this.coachString('quizClosedMessage'));
          })
          .catch(() => {
            this.$store.dispatch('createSnackbar', this.coachString('quizFailedToCloseMessage'));
          });
      },
      handleToggleVisibility(quizId, isActive) {
        const newActiveState = !isActive;
        const snackbarMessage = newActiveState
          ? this.coachString('quizVisibleToLearners')
          : this.coachString('quizNotVisibleToLearners');

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
    },
  };

</script>


<style lang="scss" scoped>

  td.status {
    padding-top: 0;
    padding-bottom: 0;
  }

</style>
