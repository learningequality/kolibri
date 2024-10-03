<template>

  <CoachAppBarPage>
    <KPageContainer>
      <PlanHeader :activeTabId="PlanTabs.QUIZZES" />
      <KTabsPanel
        :tabsId="PLAN_TABS_ID"
        :activeTabId="PlanTabs.QUIZZES"
      >
        <div class="filter-and-button">
          <p
            v-if="filteredExams.length && filteredExams.length > 0"
            class="total-quiz-size"
          >
            {{ $tr('totalQuizSize', { size: calcTotalSizeOfVisibleQuizzes }) }}
          </p>
          <KButtonGroup v-if="practiceQuizzesExist">
            <KButton
              primary
              hasDropdown
              appearance="raised-button"
              :text="newQuizAction$()"
            >
              <template #menu>
                <KDropdownMenu
                  :options="dropdownOptions"
                  class="options-btn"
                  @select="handleSelect"
                />
              </template>
            </KButton>
          </KButtonGroup>
          <div
            v-else
            class="button"
          >
            <KRouterLink
              :primary="true"
              appearance="raised-button"
              :to="newExamRoute"
              :text="newQuizAction$()"
            />
          </div>
        </div>
        <ReportsControls @export="exportCSV">
          <KSelect
            v-model="statusSelected"
            :label="filterQuizStatus$()"
            :options="statusOptions"
            :inline="true"
          />
          <KSelect
            v-model="recipientSelected"
            :label="recipientsLabel$()"
            :options="recipientOptions"
            :inline="true"
          />
        </ReportsControls>
        <CoreTable>
          <template #headers>
            <th>{{ titleLabel$() }}</th>
            <th style="position: relative">
              {{ avgScoreLabel$() }}
              <AverageScoreTooltip v-show="!$isPrint" />
            </th>
            <th>{{ coreString('progressLabel') }}</th>
            <th>{{ recipientsLabel$() }}</th>
            <th>{{ sizeLabel$() }}</th>
            <th class="center-text">
              {{ statusLabel$() }}
            </th>
          </template>
          <template #tbody>
            <transition-group
              tag="tbody"
              name="list"
            >
              <tr
                v-for="exam in filteredExams"
                :key="exam.id"
              >
                <td>
                  <KRouterLink
                    :to="$router.getRoute('QuizSummaryPage', { quizId: exam.id })"
                    appearance="basic-link"
                    :text="exam.title"
                    icon="quiz"
                  />
                </td>
                <td>
                  <Score :value="exam.avgScore" />
                </td>
                <td>
                  <StatusSummary
                    :tally="exam.tally"
                    :verbose="true"
                    :includeNotStarted="true"
                  />
                </td>
                <td>
                  <Recipients
                    :groupNames="getRecipientNamesForExam(exam)"
                    :hasAssignments="exam.assignments.length > 0"
                  />
                </td>
                <td>
                  {{ exam.size_string ? exam.size_string : '--' }}
                </td>
                <td class="button-col center-text core-table-button-col">
                  <!-- Open quiz button -->
                  <KButton
                    v-if="!exam.active && !exam.archive"
                    :text="openQuizLabel$()"
                    appearance="flat-button"
                    @click="
                      showOpenConfirmationModal = true;
                      activeQuiz = exam;
                    "
                  />
                  <!-- Close quiz button -->
                  <KButton
                    v-if="exam.active && !exam.archive"
                    :text="closeQuizLabel$()"
                    appearance="flat-button"
                    @click="
                      showCloseConfirmationModal = true;
                      activeQuiz = exam;
                    "
                  />
                  <!-- Closed quiz label -->
                  <div v-if="exam.archive">
                    {{ quizClosedLabel$() }}
                  </div>
                </td>
              </tr>
            </transition-group>
          </template>
        </CoreTable>

        <p v-if="!quizzes.length">
          {{ $tr('noExams') }}
        </p>
        <p v-else-if="statusSelected.value === filterQuizStarted$() && !startedExams.length">
          {{ coreString('noResultsLabel') }}
        </p>
        <p v-else-if="statusSelected.value === filterQuizNotStarted$() && !notStartedExams.length">
          {{ coreString('noResultsLabel') }}
        </p>
        <p v-else-if="statusSelected.value === filterQuizEnded$() && !endedExams.length">
          {{ coreString('noResultsLabel') }}
        </p>

        <!-- Modals for Close & Open of quiz from right-most column -->
        <KModal
          v-if="showOpenConfirmationModal"
          :title="openQuizLabel$()"
          :submitText="coreString('continueAction')"
          :cancelText="coreString('cancelAction')"
          @cancel="showOpenConfirmationModal = false"
          @submit="handleOpenQuiz(activeQuiz.id)"
        >
          <p>{{ openQuizModalDetail$() }}</p>
          <p v-if="activeQuiz.draft">
            {{ canNoLongerEditQuizNotice$() }}
          </p>
          <p
            v-if="
              activeQuiz.data_model_version === 3 &&
                activeQuiz.question_sources.some(s => !s.questions || s.questions.length === 0)
            "
          >
            {{ openQuizModalEmptySections$() }}
          </p>
          <p>{{ lodQuizDetail$() }}</p>
          <p>{{ fileSizeToDownload$({ size: activeQuiz.size_string }) }}</p>
        </KModal>
        <KModal
          v-if="showCloseConfirmationModal"
          :title="closeQuizLabel$()"
          :submitText="coreString('continueAction')"
          :cancelText="coreString('cancelAction')"
          @cancel="showCloseConfirmationModal = false"
          @submit="handleCloseQuiz(activeQuiz.id)"
        >
          <div>{{ closeQuizModalDetail$() }}</div>
        </KModal>
      </KTabsPanel>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { getCurrentInstance, ref } from 'kolibri.lib.vueCompositionApi';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ExamResource, UserSyncStatusResource } from 'kolibri.resources';
  import plugin_data from 'plugin_data';
  import bytesForHumans from 'kolibri.utils.bytesForHumans';
  import { mapGetters } from 'kolibri.lib.vuex';
  import useSnackbar from 'kolibri.coreVue.composables.useSnackbar';
  import { PageNames } from '../../../constants';
  import { PLAN_TABS_ID, PlanTabs } from '../../../constants/tabsConstants';
  import { coachStrings } from '../../common/commonCoachStrings';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import PlanHeader from '../../plan/PlanHeader';
  import Recipients from '../../common/Recipients';
  import useCoreCoach from '../../../composables/useCoreCoach';
  import useQuizzes from '../../../composables/useQuizzes';
  import AverageScoreTooltip from '../../common/AverageScoreTooltip';
  import commonCoach from '../../common';
  import ReportsControls from '../../../views/reports/ReportsControls.vue';
  import CSVExporter from '../../../csv/exporter';
  import * as csvFields from '../../../csv/fields';

  export default {
    name: 'CoachExamsPage',
    components: {
      CoreTable,
      CoachAppBarPage,
      PlanHeader,
      Recipients,
      AverageScoreTooltip,
      ReportsControls,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      const { classId, initClassInfo, refreshClassSummary } = useCoreCoach();
      const { quizzes, fetchQuizSizes } = useQuizzes();
      const store = getCurrentInstance().proxy.$store;
      const showOpenConfirmationModal = ref(false);
      const showCloseConfirmationModal = ref(false);
      const activeQuiz = ref(null);
      const learnOnlyDevicesExist = ref(false);

      initClassInfo().then(() => store.dispatch('notLoading'));

      // TODO: refactor to a more robust check
      UserSyncStatusResource.fetchCollection({
        force: true,
        getParams: { member_of: classId },
      }).then(data => {
        if (data && data.length > 0) {
          learnOnlyDevicesExist.value = true;
        }
      });

      fetchQuizSizes();

      const {
        filterQuizAll$,
        filterQuizStarted$,
        filterQuizNotStarted$,
        filterQuizEnded$,
        quizOpenedMessage$,
        quizFailedToOpenMessage$,
        quizClosedMessage$,
        quizFailedToCloseMessage$,
        openQuizLabel$,
        closeQuizLabel$,
        openQuizModalDetail$,
        openQuizModalEmptySections$,
        closeQuizModalDetail$,
        lodQuizDetail$,
        fileSizeToDownload$,
        titleLabel$,
        recipientsLabel$,
        sizeLabel$,
        statusLabel$,
        newQuizAction$,
        filterQuizStatus$,
        quizClosedLabel$,
        canNoLongerEditQuizNotice$,
        avgScoreLabel$,
        entireClassLabel$,
      } = coachStrings;

      const statusSelected = ref({
        label: filterQuizAll$(),
        value: filterQuizAll$(),
      });

      const recipientSelected = ref({
        label: entireClassLabel$(),
        value: entireClassLabel$(),
      });

      return {
        quizzes,
        refreshClassSummary,
        PLAN_TABS_ID,
        PlanTabs,
        showOpenConfirmationModal,
        showCloseConfirmationModal,
        activeQuiz,
        learnOnlyDevicesExist,
        statusSelected,
        filterQuizAll$,
        filterQuizStarted$,
        filterQuizNotStarted$,
        filterQuizEnded$,
        quizOpenedMessage$,
        quizFailedToOpenMessage$,
        quizClosedMessage$,
        quizFailedToCloseMessage$,
        openQuizLabel$,
        closeQuizLabel$,
        openQuizModalDetail$,
        openQuizModalEmptySections$,
        closeQuizModalDetail$,
        lodQuizDetail$,
        fileSizeToDownload$,
        titleLabel$,
        recipientsLabel$,
        sizeLabel$,
        canNoLongerEditQuizNotice$,
        statusLabel$,
        newQuizAction$,
        filterQuizStatus$,
        quizClosedLabel$,
        createSnackbar,
        avgScoreLabel$,
        entireClassLabel$,
        recipientSelected,
      };
    },
    computed: {
      ...mapGetters('classSummary', ['getRecipientNamesForExam']),
      practiceQuizzesExist() {
        return plugin_data.practice_quizzes_exist;
      },
      statusOptions() {
        return [
          {
            label: this.filterQuizAll$(),
            value: this.filterQuizAll$(),
          },
          {
            label: this.filterQuizStarted$(),
            value: this.filterQuizStarted$(),
          },
          {
            label: this.filterQuizNotStarted$(),
            value: this.filterQuizNotStarted$(),
          },
          {
            label: this.filterQuizEnded$(),
            value: this.filterQuizEnded$(),
          },
        ];
      },
      recipientOptions() {
        return [
          {
            label: this.entireClassLabel$(),
            value: this.entireClassLabel$(),
          },
          {
            label: 'Red',
            value: 'Red',
          },
          {
            label: 'Green',
            value: 'Green',
          },
          {
            label: 'Yellow',
            value: 'Yellow',
          },
        ];
      },
      startedExams() {
        return this.quizzes.filter(exam => exam.active === true && exam.archive === false);
      },
      endedExams() {
        return this.quizzes.filter(exam => exam.active === true && exam.archive === true);
      },
      notStartedExams() {
        return this.quizzes.filter(exam => exam.active === false);
      },
      filteredExams() {
        const filter = this.statusSelected.label;
        let selectedExams;
        if (filter === this.filterQuizStarted$()) {
          selectedExams = this.startedExams;
        } else if (filter === this.filterQuizNotStarted$()) {
          selectedExams = this.notStartedExams;
        } else if (filter === this.filterQuizEnded$()) {
          selectedExams = this.endedExams;
        } else {
          selectedExams = this.quizzes;
        }

        return selectedExams.map(quiz => {
          const learnersForQuiz = this.getLearnersForExam(quiz);
          quiz.tally = this.getExamStatusTally(quiz.id, learnersForQuiz);
          quiz.avgScore = this.getExamAvgScore(quiz.id, learnersForQuiz);
          return quiz;
        });
      },
      newExamRoute() {
        return {
          name: PageNames.EXAM_CREATION_ROOT,
          params: { classId: this.$route.params.classId, sectionIndex: 0, quizId: 'new' },
        };
      },
      dropdownOptions() {
        return [
          { label: this.$tr('newQuiz'), value: 'MAKE_NEW_QUIZ' },
          { label: this.$tr('selectQuiz'), value: 'SELECT_QUIZ' },
        ];
      },
      calcTotalSizeOfVisibleQuizzes() {
        if (this.filteredExams) {
          let sum = 0;
          for (const exam of this.filteredExams) {
            if (exam.active) {
              sum += exam.size;
            }
          }
          const size = bytesForHumans(sum);
          return size;
        }
        return '--';
      },
    },
    mounted() {
      if (this.$route.query.snackbar) {
        this.createSnackbar(this.$route.query.snackbar);
      }
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
            this.refreshClassSummary();
            this.showOpenConfirmationModal = false;
            this.createSnackbar(this.quizOpenedMessage$());
          })
          .catch(() => {
            this.createSnackbar(this.quizFailedToOpenMessage$());
          });
      },
      exportCSV() {
        const columns = [
          ...csvFields.title(),
          ...csvFields.recipients(this.className),
          ...csvFields.tally(),
        ];
        const fileName = this.$tr('printLabel', { className: this.className });
        new CSVExporter(columns, fileName).export(this.filteredExams);
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
            this.refreshClassSummary();
            this.showCloseConfirmationModal = false;
            this.createSnackbar(this.quizClosedMessage$());
          })
          .catch(() => {
            this.createSnackbar(this.quizFailedToCloseMessage$());
          });
      },
      handleSelect({ value }) {
        const nextRoute = this.newExamRoute;
        const nextRouteName = {
          MAKE_NEW_QUIZ: PageNames.EXAM_CREATION_ROOT,
          SELECT_QUIZ: PageNames.QUIZ_SELECT_PRACTICE_QUIZ,
        }[value];
        nextRoute.name = nextRouteName;
        this.$router.push(nextRoute);
      },
    },
    $trs: {
      noExams: {
        message: 'You do not have any quizzes',
        context: 'Message displayed when there are no quizzes within a class.',
      },
      newQuiz: {
        message: 'Create new quiz',
        context: "Title of the screen launched from the 'New quiz' button on the 'Plan' tab.\n",
      },
      selectQuiz: {
        message: 'Select quiz',
        context:
          "Practice quizzes are pre-made quizzes, that don't require the curation work on the part of the coach. Selecting a practice quiz refers to importing a ready-to-use quiz.",
      },
      totalQuizSize: {
        message: 'Total size of quizzes visible to learners: {size}',
        context:
          'Descriptive text at the top of the table that displays the calculated file size of all quiz resources (i.e. 120 MB)',
      },
      printLabel: {
        message: '{className} Lessons',
        context:
          "Title that displays on a printed copy of the 'Reports' > 'Lessons' page. This shows if the user uses the 'Print' option by clicking on the printer icon.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .filter-and-button {
    display: flex;
    flex-wrap: wrap-reverse;
    justify-content: space-between;

    button {
      align-self: flex-end;
    }
  }

  .total-quiz-size {
    flex-basis: 50%;
    margin-bottom: 25px;
  }

  .center-text {
    text-align: center;
  }

  .button-col {
    vertical-align: middle;
  }

</style>
