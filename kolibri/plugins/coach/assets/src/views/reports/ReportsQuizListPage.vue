<template>

  <CoachAppBarPage>
    <KPageContainer :class="{ print: $isPrint }">
      <ReportsHeader
        :activeTabId="ReportsTabs.QUIZZES"
        :title="$isPrint ? $tr('printLabel', { className }) : null"
      />
      <KTabsPanel
        :tabsId="REPORTS_TABS_ID"
        :activeTabId="ReportsTabs.QUIZZES"
      >
        <ReportsControls @export="exportCSV">
          <p v-if="table.length && table.length > 0">
            {{ $tr('totalQuizSize', { size: calcTotalSizeOfVisibleQuizzes }) }}
          </p>
          <KSelect
            v-model="filter"
            :label="coachString('filterQuizStatus')"
            :options="filterOptions"
            :inline="true"
          />
        </ReportsControls>
        <CoreTable :emptyMessage="emptyMessage">
          <template #headers>
            <th>{{ coachString('titleLabel') }}</th>
            <th style="position: relative">
              {{ coachString('avgScoreLabel') }}
              <AverageScoreTooltip v-show="!$isPrint" />
            </th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ coachString('recipientsLabel') }}</th>
            <th>{{ coachString('sizeLabel') }}</th>
            <th
              v-show="!$isPrint"
              class="center-text"
            >
              {{ coachString('statusLabel') }}
            </th>
          </template>
          <template #tbody>
            <transition-group
              tag="tbody"
              name="list"
            >
              <tr
                v-for="tableRow in table"
                :key="tableRow.id"
              >
                <td>
                  <KRouterLink
                    :text="tableRow.title"
                    :to="classRoute('ReportsQuizLearnerListPage', { quizId: tableRow.id })"
                    icon="quiz"
                  />
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
                <td>
                  {{ tableRow.size_string ? tableRow.size_string : '--' }}
                </td>
                <td
                  v-show="!$isPrint"
                  class="button-col center-text core-table-button-col"
                >
                  <!-- Open quiz button -->
                  <KButton
                    v-if="!tableRow.active && !tableRow.archive"
                    :text="coachString('openQuizLabel')"
                    appearance="flat-button"
                    class="table-left-aligned-button"
                    @click="
                      showOpenConfirmationModal = true;
                      modalQuiz = tableRow;
                    "
                  />
                  <!-- Close quiz button -->
                  <KButton
                    v-if="tableRow.active && !tableRow.archive"
                    :text="coachString('closeQuizLabel')"
                    appearance="flat-button"
                    class="table-left-aligned-button"
                    @click="
                      showCloseConfirmationModal = true;
                      modalQuiz = tableRow;
                    "
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
          </template>
        </CoreTable>
        <!-- Modals for Close & Open of quiz from right-most column -->
        <KModal
          v-if="showOpenConfirmationModal"
          :title="coachString('openQuizLabel')"
          :submitText="coreString('continueAction')"
          :cancelText="coreString('cancelAction')"
          @cancel="showOpenConfirmationModal = false"
          @submit="handleOpenQuiz(modalQuiz.id)"
        >
          <p>{{ coachString('openQuizModalDetail') }}</p>
          <p
            v-if="
              modalQuiz.data_model_version === 3 &&
                modalQuiz.question_sources.some(s => !s.questions || s.questions.length === 0)
            "
          >
            {{ coachString('openQuizModalEmptySections') }}
          </p>
          <p>{{ coachString('lodQuizDetail') }}</p>
          <p>{{ coachString('fileSizeToDownload', { size: modalQuiz.size_string }) }}</p>
        </KModal>
        <KModal
          v-if="showCloseConfirmationModal"
          :title="coachString('closeQuizLabel')"
          :submitText="coreString('continueAction')"
          :cancelText="coreString('cancelAction')"
          @cancel="showCloseConfirmationModal = false"
          @submit="handleCloseQuiz(modalQuiz.id)"
        >
          <div>{{ coachString('closeQuizModalDetail') }}</div>
        </KModal>
      </KTabsPanel>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ExamResource } from 'kolibri.resources';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';
  import { REPORTS_TABS_ID, ReportsTabs } from '../../constants/tabsConstants';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import ReportsControls from './ReportsControls';
  import ReportsHeader from './ReportsHeader';

  export default {
    name: 'ReportsQuizListPage',
    components: {
      CoachAppBarPage,
      ReportsControls,
      ReportsHeader,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar };
    },
    data() {
      return {
        REPORTS_TABS_ID,
        ReportsTabs,
        filter: 'allQuizzes',
        showOpenConfirmationModal: false,
        showCloseConfirmationModal: false,
        modalQuiz: null,
      };
    },
    computed: {
      emptyMessage() {
        if (this.filter.value === 'allQuizzes') {
          return this.coachString('quizListEmptyState');
        }
        if (this.filter.value === 'startedQuizzes') {
          return this.coreString('noResultsLabel');
        }
        if (this.filter.value === 'quizzesNotStarted') {
          return this.coreString('noResultsLabel');
        }
        if (this.filter.value === 'endedQuizzes') {
          return this.$tr('noEndedExams');
        }

        return '';
      },
      filterOptions() {
        return [
          {
            label: this.coachString('filterQuizAll'),
            value: 'allQuizzes',
            noStartedExams: 'No started quizzes',
            noExamsNotStarted: 'No quizzes not started',
          },
          {
            label: this.coachString('filterQuizStarted'),
            value: 'startedQuizzes',
          },
          {
            label: this.coachString('filterQuizNotStarted'),
            value: 'quizzesNotStarted',
          },
          {
            label: this.coachString('filterQuizEnded'),
            value: 'endedQuizzes',
          },
        ];
      },
      table() {
        const filtered = this.exams.filter(exam => {
          if (this.filter.value === 'allQuizzes') {
            return true;
          } else if (this.filter.value === 'startedQuizzes') {
            return exam.active && !exam.archive;
          } else if (this.filter.value === 'quizzesNotStarted') {
            return !exam.active;
          } else if (this.filter.value === 'endedQuizzes') {
            return exam.active && exam.archive;
          }
        });
        const sorted = this._.orderBy(filtered, ['date_created'], ['desc']);
        return sorted.map(exam => {
          const learnersForQuiz = this.getLearnersForExam(exam);
          const tableRow = {
            totalLearners: learnersForQuiz.length,
            tally: this.getExamStatusTally(exam.id, learnersForQuiz),
            groupNames: this.getGroupNames(exam.groups),
            recipientNames: this.getRecipientNamesForExam(exam),
            avgScore: this.getExamAvgScore(exam.id, learnersForQuiz),
            hasAssignments: learnersForQuiz.length > 0,
          };
          Object.assign(tableRow, exam);
          return tableRow;
        });
      },
      calcTotalSizeOfVisibleQuizzes() {
        if (this.exams) {
          let sum = 0;
          this.exams.forEach(exam => {
            if (exam.active) {
              sum += exam.size;
            }
          });
          const size = bytesForHumans(sum);
          return size;
        }
        return '--';
      },
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    methods: {
      handleOpenQuiz(quizId) {
        const promise = ExamResource.saveModel({
          id: quizId,
          data: {
            active: true,
            draft: false,
          },
          exists: true,
        });

        return promise
          .then(() => {
            this.$store.dispatch('classSummary/refreshClassSummary');
            this.showOpenConfirmationModal = false;
            this.createSnackbar(this.coachString('quizOpenedMessage'));
          })
          .catch(() => {
            this.createSnackbar(this.coachString('quizFailedToOpenMessage'));
          });
      },
      handleCloseQuiz(quizId) {
        const promise = ExamResource.saveModel({
          id: quizId,
          data: {
            archive: true,
          },
          exists: true,
        });

        return promise
          .then(() => {
            this.$store.dispatch('classSummary/refreshClassSummary');
            this.showCloseConfirmationModal = false;
            this.createSnackbar(this.coachString('quizClosedMessage'));
          })
          .catch(() => {
            this.createSnackbar(this.coachString('quizFailedToCloseMessage'));
          });
      },
      exportCSV() {
        const columns = [
          ...csvFields.title(),
          ...csvFields.avgScore(),
          ...csvFields.recipients(this.className),
          ...csvFields.tally(),
          ...csvFields.allLearners('totalLearners'),
        ];

        const fileName = this.$tr('printLabel', { className: this.className });
        new CSVExporter(columns, fileName).export(this.table);
      },
    },
    $trs: {
      noEndedExams: {
        message: 'No ended quizzes',
        context:
          'Message displayed when there are no ended quizes. Ended quizzes are those that are no longer in progress.',
      },
      printLabel: {
        message: '{className} Quizzes',
        context:
          "Title that displays on a printed copy of the 'Reports' > 'Quizzes' page. This shows if the user uses the 'Print' option by clicking on the printer icon and displays on the downloadable CSV file.",
      },
      totalQuizSize: {
        message: 'Total size of quizzes visible to learners: {size}',
        context:
          'Descriptive text at the top of the table that displays the calculated file size of all quiz resources (i.e. 120 MB)',
      },
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
