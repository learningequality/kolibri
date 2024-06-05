<template>

  <CoachAppBarPage>

    <KGrid v-if="exam" gutter="16">
      <KGridItem>
        <QuizLessonDetailsHeader
          examOrLesson="exam"
          :backlink="
            group ? classRoute('ReportsGroupReportPage') : classRoute('ReportsQuizListPage')"
          :backlinkLabel="group ? group.name : coachString('allQuizzesLabel')"
          optionsFor="report"
        >
          <template #dropdown>
            <QuizOptionsDropdownMenu
              optionsFor="report"
              :draft="exam && exam.draft"
              @select="handleSelectOption"
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
        <h2 class="visuallyhidden">
          {{ coachString('detailsLabel') }}
        </h2>
        <KPageContainer :topMargin="$isPrint ? 0 : 16">
          <ReportsControls @export="$emit('export')" />
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
          <slot></slot>
        </KPageContainer>
      </KGridItem>
    </KGrid>
  </CoachAppBarPage>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import CoachAppBarPage from '../CoachAppBarPage';
  import { PageNames } from '../../constants';
  import { QUIZZES_TABS_ID, QuizzesTabs } from '../../constants/tabsConstants';
  import { useCoachTabs } from '../../composables/useCoachTabs';
  import QuizOptionsDropdownMenu from '../plan/QuizSummaryPage/QuizOptionsDropdownMenu';
  import ReportsControls from './ReportsControls';

  export default {
    name: 'ReportsQuizBaseListPage',
    components: {
      CoachAppBarPage,
      ReportsControls,
      QuizOptionsDropdownMenu,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { saveTabsClick, wereTabsClickedRecently } = useCoachTabs();
      return {
        saveTabsClick,
        wereTabsClickedRecently,
      };
    },
    props: {
      activeTabId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        QUIZZES_TABS_ID,
      };
    },
    computed: {
      avgScore() {
        return this.getExamAvgScore(this.$route.params.quizId, this.recipients);
      },
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      recipients() {
        return this.getLearnersForExam(this.exam);
      },
      group() {
        return this.$route.params.groupId && this.groupMap[this.$route.params.groupId];
      },
      tabs() {
        return [
          {
            id: QuizzesTabs.REPORT,
            label: this.coachString('reportLabel'),
            to: this.group
              ? this.classRoute('ReportsGroupReportQuizLearnerListPage')
              : this.classRoute('ReportsQuizLearnerListPage'),
          },
          {
            id: QuizzesTabs.DIFFICULT_QUESTIONS,
            label: this.coachString('difficultQuestionsLabel'),
            to: this.group
              ? this.classRoute('ReportsGroupReportQuizQuestionListPage')
              : this.classRoute('ReportsQuizQuestionListPage'),
          },
        ];
      },
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
      handleSelectOption(option) {
        if (option === 'EDIT_DETAILS') {
          this.$router.push({
            name: PageNames.EXAM_CREATION_ROOT,
            params: { ...this.$route.params },
            query: this.defaultBackLinkQuery,
          });
        }
        if (option === 'PREVIEW') {
          this.$router.push(
            this.$router.getRoute('ReportsQuizPreviewPage', {}, this.defaultBackLinkQuery)
          );
        }
        if (option === 'PRINT_REPORT') {
          this.$print();
        }
        if (option === 'EXPORT') {
          this.$emit('export');
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/three-card-layout';

</style>
