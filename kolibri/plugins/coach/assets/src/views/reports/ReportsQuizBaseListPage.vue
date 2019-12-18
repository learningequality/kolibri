<template>

  <CoreBase
    :immersivePage="false"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :showSubNav="true"
  >
    <TopNavbar slot="sub-nav" />

    <KGrid gutter="16">
      <KGridItem>
        <QuizLessonDetailsHeader
          examOrLesson="exam"
          :backlink="classRoute('ReportsQuizListPage')"
          :backlinkLabel="coachString('allQuizzesLabel')"
          optionsFor="report"
        >
          <QuizOptionsDropdownMenu
            slot="dropdown"
            optionsFor="report"
            @select="handleSelectOption"
          />
        </QuizLessonDetailsHeader>
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 4 }">
        <QuizStatus
          :className="className"
          :avgScore="avgScore"
          :groupAndAdHocLearnerNames="getRecipientNamesForExam(exam)"
          :exam="exam"
        />
      </KGridItem>
      <KGridItem :layout12="{ span: $isPrint ? 12 : 8 }">
        <KPageContainer :topMargin="$isPrint ? 0 : 16">
          <ReportsControls @export="$emit('export')" />
          <HeaderTabs :enablePrint="true">
            <HeaderTab
              :text="coachString('reportLabel')"
              :to="classRoute('ReportsQuizLearnerListPage')"
            />
            <HeaderTab
              :text="coachString('difficultQuestionsLabel')"
              :to="classRoute('ReportsQuizQuestionListPage')"
            />
          </HeaderTabs>
          <slot></slot>
        </KPageContainer>
      </KGridItem>
    </KGrid>
  </CoreBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import QuizOptionsDropdownMenu from '../plan/QuizSummaryPage/QuizOptionsDropdownMenu';
  import ReportsControls from './ReportsControls';

  export default {
    name: 'ReportsQuizBaseListPage',
    components: {
      ReportsControls,
      QuizOptionsDropdownMenu,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        filter: 'allQuizzes',
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
      filterOptions() {
        return [
          {
            label: this.coachString('allQuizzesLabel'),
            value: 'allQuizzes',
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
    },
    beforeMount() {
      this.filter = this.filterOptions[0];
    },
    methods: {
      handleSelectOption(option) {
        if (option === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('QuizReportEditDetailsPage'));
        }
        if (option === 'PREVIEW') {
          this.$router.push(this.$router.getRoute('ReportsQuizPreviewPage'));
        }
        if (option === 'PRINT_REPORT') {
          this.$print();
        }
        if (option === 'EXPORT') {
          this.$emit('export');
        }
      },
    },
    $trs: {
      allQuizzes: 'All quizzes',
      activeQuizzes: 'Active quizzes',
      inactiveQuizzes: 'Inactive quizzes',
    },
  };

</script>


<style lang="scss" scoped>

  @import '../common/three-card-layout';

</style>
