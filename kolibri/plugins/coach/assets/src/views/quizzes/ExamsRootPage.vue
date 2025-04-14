<template>

  <CoachAppBarPage>
    <KPageContainer>
      <div
        v-if="hasNoChannels && !isLoading"
        class="alert banner-spacing"
        :style="{ backgroundColor: $themePalette.yellow.v_200 }"
      >
        <div>
          <KIcon
            icon="warning"
            class="warning-icon"
            :color="$themePalette.yellow.v_600"
          />
        </div>

        <div
          v-if="hasNoChannels"
          class="error-message"
        >
          <p>{{ noResourcesAvailable$() }}</p>
          <KExternalLink
            v-if="deviceContentUrl"
            :text="$tr('adminLink')"
            :href="deviceContentUrl"
          />
        </div>
      </div>
      <CoachHeader :title="quizzesLabel$()">
        <template #actions>
          <KButton
            v-if="practiceQuizzesExist && !hasNoChannels"
            class="new-quiz-button"
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
          <KRouterLink
            v-else-if="!hasNoChannels"
            primary
            appearance="raised-button"
            :to="newExamRoute"
            :text="newQuizAction$()"
          />
        </template>
      </CoachHeader>
      <div>
        <p v-if="filteredExams.length && filteredExams.length > 0">
          {{ $tr('totalQuizSize', { size: calcTotalSizeOfVisibleQuizzes }) }}
        </p>

        <ReportsControls
          class="report-controls"
          @export="exportCSV"
        >
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
        <CoreTable
          :emptyMessage="quizzes.length > 0 ? coreString('noResultsLabel') : $tr('noExams')"
        >
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
                    :to="$router.getRoute(PageNames.EXAM_SUMMARY, { quizId: exam.id })"
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
      </div>
    </KPageContainer>
  </CoachAppBarPage>

</template>


<script>

  import { getCurrentInstance, ref } from 'vue';
  import CoreTable from 'kolibri/components/CoreTable';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import urls from 'kolibri/urls';
  import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
  import ExamResource from 'kolibri-common/apiResources/ExamResource';
  import UserSyncStatusResource from 'kolibri-common/apiResources/UserSyncStatusResource';
  import plugin_data from 'kolibri-plugin-data';
  import bytesForHumans from 'kolibri/uiText/bytesForHumans';
  import { mapState, mapGetters } from 'vuex';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import useUser from 'kolibri/composables/useUser';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { PageNames } from '../../constants';
  import { coachStrings } from '../common/commonCoachStrings';
  import CoachAppBarPage from '../CoachAppBarPage';
  import Recipients from '../common/Recipients';
  import useCoreCoach from '../../composables/useCoreCoach';
  import useQuizzes from '../../composables/useQuizzes';
  import AverageScoreTooltip from '../common/AverageScoreTooltip';
  import ReportsControls from '../common/ReportsControls';
  import CSVExporter from '../../csv/exporter';
  import * as csvFields from '../../csv/fields';
  import Score from '../common/Score.vue';
  import StatusSummary from '../common/status/StatusSummary';
  import CoachHeader from '../common/CoachHeader.vue';

  export default {
    name: 'ExamsRootPage',
    components: {
      CoreTable,
      CoachAppBarPage,
      Recipients,
      AverageScoreTooltip,
      ReportsControls,
      Score,
      StatusSummary,
      CoachHeader,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      const { classId, initClassInfo, refreshClassSummary } = useCoreCoach();
      const { quizzes, fetchQuizSizes } = useQuizzes();
      const store = getCurrentInstance().proxy.$store;
      const showOpenConfirmationModal = ref(false);
      const showCloseConfirmationModal = ref(false);
      const activeQuiz = ref(null);
      const learnOnlyDevicesExist = ref(false);
      const { noResourcesAvailable$ } = enhancedQuizManagementStrings;
      const { canManageContent } = useUser();

      initClassInfo().then(() => store.dispatch('notLoading'));

      // TODO: refactor to a more robust check
      UserSyncStatusResource.fetchCollection({
        force: true,
        getParams: { member_of: classId.value },
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
        quizzesLabel$,
      } = coachStrings;

      const statusSelected = ref({
        label: filterQuizAll$(),
        value: filterQuizAll$(),
      });

      const recipientSelected = ref({
        label: filterQuizAll$(),
        value: filterQuizAll$(),
      });

      return {
        quizzes,
        refreshClassSummary,
        PageNames,
        showOpenConfirmationModal,
        showCloseConfirmationModal,
        activeQuiz,
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
        noResourcesAvailable$,
        statusLabel$,
        newQuizAction$,
        filterQuizStatus$,
        quizClosedLabel$,
        createSnackbar,
        avgScoreLabel$,
        entireClassLabel$,
        quizzesLabel$,
        recipientSelected,
        canManageContent,
      };
    },
    data() {
      return {
        channels: [],
        isLoading: true,
      };
    },
    computed: {
      ...mapGetters('classSummary', [
        'groups',
        'getExamAvgScore',
        'getExamStatusTally',
        'getLearnersForExam',
        'getRecipientNamesForExam',
        'getGroupNames',
      ]),
      ...mapState('classSummary', { className: 'name' }),
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
        const groupOptions = this.groups.map(group => ({
          label: group.name,
          value: group.id,
        }));

        return [
          {
            label: this.filterQuizAll$(),
            value: this.filterQuizAll$(),
          },
          {
            label: this.entireClassLabel$(),
            value: this.entireClassLabel$(),
          },
          ...groupOptions,
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

        const recipientsFilter = this.recipientSelected.value;

        if (recipientsFilter !== this.filterQuizAll$()) {
          if (recipientsFilter !== this.entireClassLabel$()) {
            selectedExams = selectedExams.filter(exam => {
              return (
                exam.groups.includes(recipientsFilter) ||
                exam.learner_ids.includes(recipientsFilter)
              );
            });
          } else {
            selectedExams = selectedExams.filter(exam => {
              const hasNoGroups = !exam.groups || exam.groups.length === 0;
              const hasNoLearners = !exam.learner_ids || exam.learner_ids.length === 0;
              return hasNoGroups && hasNoLearners;
            });
          }
        }
        return selectedExams.map(quiz => {
          const learnersForQuiz = this.getLearnersForExam(quiz);
          quiz.tally = this.getExamStatusTally(quiz.id, learnersForQuiz);
          quiz.avgScore = this.getExamAvgScore(quiz.id, learnersForQuiz);
          quiz.totalLearners = this.getLearnersForExam(quiz).length;
          quiz.recipientNames = this.getRecipientNamesForExam(quiz);
          quiz.hasAssignments = quiz.assignments.length > 0;
          quiz.groupNames = this.getGroupNames(quiz.groups);
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
        if (!this.filteredExams || this.filteredExams.length === 0) {
          return '--';
        }
        let sum = 0;
        for (const exam of this.filteredExams) {
          if (exam.active && exam.size && !isNaN(exam.size)) {
            sum += exam.size;
          }
        }
        if (sum === 0) {
          return '--';
        }
        const size = bytesForHumans(sum);
        return size;
      },
      deviceContentUrl() {
        const deviceContentUrl = urls['kolibri:kolibri.plugins.device:device_management'];
        if (deviceContentUrl && this.canManageContent) {
          return `${deviceContentUrl()}#/content`;
        }

        return '';
      },
      hasNoChannels() {
        return this.channels.length === 0;
      },
    },
    mounted() {
      this.fetchResources(); // Call the method to fetch the resources
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
          ...csvFields.avgScore(),
          ...csvFields.allLearners('totalLearners'),
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
      fetchResources() {
        this.isLoading = true;
        ChannelResource.fetchCollection({
          getParams: {
            contains_exercise: true,
            available: true,
          },
        }).then(data => {
          this.channels = data;
          this.isLoading = false;
        });
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
        message: '{className} Quizzes',
        context:
          "Title that displays on a printed copy of the 'Coach' > 'Quizzes' page. This shows if the user uses the 'Print' option by clicking on the printer icon.",
      },
      adminLink: {
        message: 'Import channels to your device',
        context: 'Message for admin indicating the possibility of importing channels into Kolibri.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .center-text {
    text-align: center;
  }

  .button-col {
    vertical-align: middle;
  }

  .class-name-icon {
    position: relative;
    top: 0.5em;
    width: 1.5em;
    height: 1.5em;
    margin-right: 0.5em;
  }

  .alert {
    position: relative;
    width: 100%;
    max-width: 1000px;
    padding: 0.5em;
    padding-left: 2em;
    margin: 1em auto 0;
  }

  .warning-icon {
    position: absolute;
    top: 1em;
    left: 1em;
    width: 24px;
    height: 24px;
  }

  .error-message {
    margin-left: 3em;
    font-size: 14px;
  }

  .banner-spacing {
    margin: 0 0 1em;
  }

  @media print {
    .new-quiz-button {
      display: none;
    }
  }

</style>
