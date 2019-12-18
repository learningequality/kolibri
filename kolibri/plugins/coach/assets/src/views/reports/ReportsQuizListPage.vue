<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >

    <TopNavbar slot="sub-nav" />

    <KPageContainer :class="{'print': $isPrint}">
      <ReportsHeader :title="$isPrint ? $tr('printLabel', {className}) : null" />
      <ReportsControls @export="exportCSV">
        <!-- Hidden temporarily per https://github.com/learningequality/kolibri/issues/6174
        <KSelect
          v-model="filter"
          :label="coreString('showAction')"
          :options="filterOptions"
          :inline="true"
        />
        -->
      </ReportsControls>
      <CoreTable :emptyMessage="emptyMessage">
        <thead slot="thead">
          <tr>
            <th>{{ coachString('titleLabel') }}</th>
            <th style="position:relative;">
              {{ coachString('avgScoreLabel') }}
              <AverageScoreTooltip v-show="!$isPrint" />
            </th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('recipientsLabel') }}</th>
            <th v-show="!$isPrint" class="center-text">
              {{ coachString('statusLabel') }}
            </th>
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
                :includeNotStarted="true"
              />
            </td>
            <td>
              <Recipients
                :groupNames="getRecipientNamesForExam(tableRow)"
                :hasAssignments="tableRow.hasAssignments"
              />
            </td>
            <td
              v-show="!$isPrint"
              class="center-text button-col core-table-button-col"
            >
              <!-- Open quiz button -->
              <KButton
                v-if="!tableRow.active && !tableRow.archive"
                :text="coachString('openQuizLabel')"
                appearance="flat-button"
                class="table-left-aligned-button"
                @click="showOpenConfirmationModal = true; modalQuizId=tableRow.id"
              />
              <!-- Close quiz button -->
              <KButton
                v-if="tableRow.active && !tableRow.archive"
                :text="coachString('closeQuizLabel')"
                appearance="flat-button"
                class="table-left-aligned-button"
                @click="showCloseConfirmationModal = true; modalQuizId=tableRow.id;"
              />
              <div
                v-if="tableRow.archive"
                class="quiz-closed-label"
              >
                {{ coachString('quizClosedLabel') }}
              </div>
            </td>
          </tr>
        </transition-group>
      </CoreTable>
      <!-- Modals for Close & Open of quiz from right-most column -->
      <KModal
        v-if="showOpenConfirmationModal"
        :title="coachString('openQuizLabel')"
        :submitText="coreString('continueAction')"
        :cancelText="coreString('cancelAction')"
        @cancel="showOpenConfirmationModal = false"
        @submit="handleOpenQuiz(modalQuizId)"
      >
        <div>{{ coachString('openQuizModalDetail') }}</div>
      </KModal>
      <KModal
        v-if="showCloseConfirmationModal"
        :title="coachString('closeQuizLabel')"
        :submitText="coreString('continueAction')"
        :cancelText="coreString('cancelAction')"
        @cancel="showCloseConfirmationModal = false"
        @submit="handleCloseQuiz(modalQuizId)"
      >
        <div>{{ coachString('closeQuizModalDetail') }}</div>
      </KModal>
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ExamResource } from 'kolibri.resources';
  import commonCoach from '../common';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsControls from './ReportsControls';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsQuizListPage',
    components: {
      ReportsControls,
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
        const sorted = this._.orderBy(filtered, ['date_created'], ['desc']);
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
      exportCSV() {
        const columns = [
          ...csvFields.title(),
          ...csvFields.avgScore(),
          ...csvFields.recipients(),
          ...csvFields.tally(),
        ];

        const fileName = this.$tr('printLabel', { className: this.className });
        new CSVExporter(columns, fileName).export(this.table);
      },
    },
    $trs: {
      noActiveExams: 'No active quizzes',
      noInactiveExams: 'No inactive quizzes',
      printLabel: '{className} Quizzes',
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/print-table';

  .center-text {
    text-align: center;
  }

  .button-col {
    vertical-align: middle;
  }

</style>
