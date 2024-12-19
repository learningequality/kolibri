<template>

  <CoachAppBarPage>
    <KGrid
      v-if="exam"
      gutter="16"
    >
      <KGridItem>
        <QuizLessonDetailsHeader
          :backlink="
            group
              ? classRoute(classRoute(PageNames.GROUP_SUMMARY))
              : classRoute(PageNames.EXAMS_ROOT)
          "
          :backlinkLabel="group ? group.name : coachString('allQuizzesLabel')"
          examOrLesson="exam"
        >
          <template #dropdown>
            <KRouterLink
              :to="classRoute(PageNames.QUIZ_PREVIEW, {}, { last: PageNames.EXAM_SUMMARY })"
              :text="coachString('previewAction')"
              appearance="raised-button"
              style="margin-right: 8px"
            />
            <QuizOptionsDropdownMenu
              :exam="exam"
              @select="setCurrentAction"
            />
          </template>
        </QuizLessonDetailsHeader>
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 4 }">
        <h2 class="visuallyhidden">
          {{ coachString('generalInformationLabel') }}
        </h2>
        <QuizStatus
          :className="className"
          :avgScore="avgScore"
          :groupAndAdHocLearnerNames="getRecipientNamesForExam(exam)"
          :exam="exam"
        />
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 8 }">
        <KPageContainer
          v-if="!loading"
          :topMargin="$isPrint ? 0 : 16"
        >
          <ReportsControls @export="exportCSV" />
          <HeaderTabs :enablePrint="true">
            <KTabsList
              ref="tabList"
              :tabsId="QUIZZES_TABS_ID"
              :ariaLabel="coachString('detailsLabel')"
              :activeTabId="activeTabId"
              :tabs="tabs"
              @click="() => saveTabsClick(QUIZZES_TABS_ID)"
            />
          </HeaderTabs>
          <KTabsPanel
            :tabsId="QUIZZES_TABS_ID"
            :activeTabId="activeTabId"
          >
            <template #[QuizzesTabs.REPORT]>
              <LearnersTable
                ref="table"
                :entries="learnersTable"
                :questionCount="exam.question_count"
              />
            </template>
            <template #[QuizzesTabs.DIFFICULT_QUESTIONS]>
              <DifficultQuestionsTable
                ref="table"
                :entries="difficultQuestionsTable"
              />
            </template>
          </KTabsPanel>
        </KPageContainer>
      </KGridItem>
    </KGrid>
    <ManageExamModals
      :currentAction="currentAction"
      :quiz="exam"
      @submit_delete="handleSubmitDelete"
      @submit_copy="handleSubmitCopy"
      @cancel="closeModal"
    />
  </CoachAppBarPage>

</template>


<script>

  import { mapState } from 'vuex';
  import find from 'lodash/find';
  import sortBy from 'lodash/sortBy';
  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ExamResource from 'kolibri-common/apiResources/ExamResource';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { convertExamQuestionSources } from 'kolibri-common/quizzes/utils';
  import { QUIZZES_TABS_ID, QuizzesTabs } from '../../../constants/tabsConstants';
  import { useCoachTabs } from '../../../composables/useCoachTabs';

  import commonCoach from '../../common';
  import CoachAppBarPage from '../../CoachAppBarPage';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import ReportsControls from '../../common/ReportsControls';
  import LearnersTable from '../../common/tables/ReportsLearnersTable';
  import DifficultQuestionsTable from './tables/DifficultQuestionsTable';
  import QuizOptionsDropdownMenu from './QuizOptionsDropdownMenu';
  import ManageExamModals from './ManageExamModals';
  import {
    fetchQuizSummaryPageData,
    serverAssignmentPayload,
    clientAssigmentState,
    deleteExam,
  } from './api';

  export default {
    name: 'QuizSummaryPage',
    components: {
      CoachAppBarPage,
      ReportsControls,
      ManageExamModals,
      LearnersTable,
      QuizOptionsDropdownMenu,
      DifficultQuestionsTable,
    },
    mixins: [commonCoach, coachStringsMixin, commonCoreStrings],
    setup() {
      const { createSnackbar, clearSnackbar } = useSnackbar();

      const { saveTabsClick, wereTabsClickedRecently } = useCoachTabs();

      return {
        wereTabsClickedRecently,
        createSnackbar,
        clearSnackbar,
        saveTabsClick,
      };
    },
    data() {
      return {
        loading: true,
        currentAction: '',
        QUIZZES_TABS_ID,
        QuizzesTabs,
        difficultQuestions: [],
      };
    },
    computed: {
      ...mapState(['classList']),
      quizId() {
        return this.$route.params.quizId;
      },
      activeTabId() {
        const { tabId } = this.$route.params;
        if (Object.values(QuizzesTabs).includes(tabId)) {
          return tabId;
        }
        return QuizzesTabs.REPORT;
      },
      avgScore() {
        return this.getExamAvgScore(this.quizId, this.recipients);
      },
      exam() {
        return this.examMap[this.quizId];
      },
      group() {
        return this.$route.params.groupId && this.groupMap[this.$route.params.groupId];
      },
      recipients() {
        return this.getLearnersForExam(this.exam);
      },
      classId() {
        return this.$route.params.classId;
      },
      tabs() {
        const tabsList = [
          {
            id: QuizzesTabs.REPORT,
            label: this.coachString('learnersLabel'),
          },
        ];

        const isDraftExam = this.exam && this.exam.draft;
        if (!isDraftExam) {
          tabsList.push({
            id: QuizzesTabs.DIFFICULT_QUESTIONS,
            label: this.coachString('difficultQuestionsLabel'),
          });
        }

        tabsList.forEach(tab => {
          tab.to = this.classRoute(
            this.group ? this.PageNames.GROUP_EXAM_SUMMARY : this.PageNames.EXAM_SUMMARY,
            { tabId: tab.id },
          );
        });

        return tabsList;
      },
      learnersTable() {
        const learners = this.recipients.map(learnerId => this.learnerMap[learnerId]);
        const sorted = sortBy(learners, ['name']);
        return sorted.map(learner => {
          const tableRow = {
            groups: this.getGroupNamesForLearner(learner.id),
            statusObj: this.getExamStatusObjForLearner(this.exam.id, learner.id),
            link: this.detailLink(learner.id),
          };
          Object.assign(tableRow, learner);
          return tableRow;
        });
      },
      difficultQuestionsTable() {
        return this.difficultQuestions.map(question => {
          const tableRow = {};
          Object.assign(tableRow, question);
          return tableRow;
        });
      },
    },
    beforeRouteEnter(to, from, next) {
      return fetchQuizSummaryPageData(to.params.quizId)
        .then(data => {
          next(vm => vm.setData(data));
        })
        .catch(error => {
          next(vm => vm.setError(error));
        });
    },
    mounted() {
      // focus the active tab but only when it's likely
      // that this header was re-mounted as a result
      // of navigation after clicking a tab (focus shouldn't
      // be manipulated programatically in other cases, e.g.
      // when visiting the page for the first time)
      if (this.wereTabsClickedRecently(this.QUIZZES_TABS_ID)) {
        this.$nextTick(() => {
          this.$refs.tabList.focusActiveTab();
        });
      }
    },
    methods: {
      /**
       * @public
       */
      setData(data) {
        const { difficultQuestions } = data;
        this.difficultQuestions = difficultQuestions;
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      /**
       * @public
       */
      setError(error) {
        try {
          this.$store.dispatch('handleApiError', { error });
        } catch (e) {
          // nothing to do here, just catching the error to avoid
          // unhandled errors in the dispatch to handleApiError
        }
        this.loading = false;
        this.$store.dispatch('notLoading');
      },
      setCurrentAction(action) {
        if (action === 'EDIT_DETAILS') {
          this.$router.push({
            name: this.PageNames.EXAM_CREATION_ROOT,
            params: { ...this.$route.params, sectionIndex: 0 },
          });
        } else {
          this.currentAction = action;
        }
      },
      closeModal() {
        this.currentAction = '';
      },
      async handleSubmitCopy({ classroomId, groupIds, adHocLearnerIds, examTitle }) {
        const title = examTitle.trim().substring(0, 100).trim();

        const assignments = serverAssignmentPayload(groupIds, classroomId);

        const newQuiz = {
          title,
          draft: true,
          collection: classroomId,
          assignments,
          learner_ids: adHocLearnerIds,
          // This ensures backward compatibility for all question_sources versions
          question_sources: (await convertExamQuestionSources(this.exam)).question_sources,
        };

        ExamResource.saveModel({ data: newQuiz })
          .then(result => {
            this.showSnackbarNotification('quizCopied');
            // If exam was copied to the current classroom, add it to the classSummary module
            if (classroomId === this.classId) {
              const object = {
                id: result.id,
                title: result.title,
                groups: clientAssigmentState(groupIds.concat(), this.classId),
                active: false,
              };
              this.$store.commit('classSummary/CREATE_ITEM', {
                map: 'examMap',
                id: object.id,
                object,
              });
            }
            this.closeModal();
          })
          .catch(error => {
            const caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.UNIQUE]);
            if (caughtErrors) {
              const className = find(this.classList, { id: classroomId }).name;
              this.createSnackbar({
                text: this.$tr('uniqueTitleError', {
                  title,
                  className,
                }),
                autoDismiss: false,
                actionText: this.coreString('closeAction'),
                actionCallback: () => this.clearSnackbar(),
              });
            } else {
              this.$store.dispatch('handleApiError', { error });
            }
            this.$store.dispatch('notLoading');
            this.closeModal();
          });
      },
      handleSubmitDelete() {
        return deleteExam(this.quizId)
          .then(() => {
            this.$store.commit('classSummary/DELETE_ITEM', { map: 'examMap', id: this.quizId });
            this.$router.replace(this.classRoute(this.PageNames.EXAMS_ROOT), () => {
              this.showSnackbarNotification('quizDeleted');
            });
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', { error });
          });
      },
      detailLink(learnerId) {
        return this.classRoute(this.PageNames.QUIZ_LEARNER_PAGE_ROOT, {
          learnerId,
        });
      },
      exportCSV() {
        if (typeof this.$refs.table.exportCSV === 'function') {
          this.$refs.table.exportCSV();
        }
      },
    },
    $trs: {
      uniqueTitleError: {
        message: `A quiz titled '{title}' already exists in '{className}'`,
        context:
          'Displays if user attempts to give a quiz the same name as one that already exists.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  // HACK: to prevent perseus multi-choice tiles from appearing
  // over modal overlay and snackbar
  /deep/ .perseus-radio-selected {
    z-index: 0 !important;
  }

</style>
