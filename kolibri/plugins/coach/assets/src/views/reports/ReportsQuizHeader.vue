<template>

  <div>
    <BackLinkWithOptions>
      <BackLink
        slot="backlink"
        :to="classRoute('ReportsQuizListPage')"
        :text="coachString('allQuizzesLabel')"
      />
      <QuizOptionsDropdownMenu
        slot="options"
        optionsFor="report"
        @select="handleSelectOption"
      />
    </BackLinkWithOptions>

    <h1>
      <KLabeledIcon icon="quiz" :label="exam.title" />
    </h1>

    <HeaderTable>
      <HeaderTableRow :keyText="coachString('statusLabel')">
        <QuizActive
          slot="value"
          :active="exam.active"
        />
      </HeaderTableRow>
      <HeaderTableRow :keyText="coachString('recipientsLabel')">
        <Recipients
          slot="value"
          :groupNames="getGroupNames(exam.groups)"
          :hasAssignments="exam.assignments.length > 0"
        />
      </HeaderTableRow>
      <HeaderTableRow :keyText="coachString('avgScoreLabel')">
        <Score slot="value" :value="avgScore" />
      </HeaderTableRow>
      <HeaderTableRow
        :keyText="coachString('questionOrderLabel')"
        :valueText="orderDescriptionString"
      />
    </HeaderTable>

    <HeaderTabs>
      <HeaderTab
        :text="coachString('reportLabel')"
        :to="classRoute('ReportsQuizLearnerListPage')"
      />
      <HeaderTab
        :text="coachString('difficultQuestionsLabel')"
        :to="classRoute('ReportsQuizQuestionListPage')"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';
  import QuizOptionsDropdownMenu from '../plan/QuizSummaryPage/QuizOptionsDropdownMenu';
  import BackLinkWithOptions from '../common/BackLinkWithOptions';

  export default {
    name: 'ReportsQuizHeader',
    components: {
      BackLinkWithOptions,
      QuizOptionsDropdownMenu,
    },
    mixins: [commonCoach],
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
      orderDescriptionString() {
        return this.exam.learners_see_fixed_order
          ? this.coachString('orderFixedLabel')
          : this.coachString('orderRandomLabel');
      },
    },
    methods: {
      handleSelectOption(option) {
        if (option === 'EDIT_DETAILS') {
          this.$router.push(this.$router.getRoute('QuizReportEditDetailsPage'));
        }
        if (option === 'PREVIEW') {
          this.$router.push(this.$router.getRoute('ReportsQuizPreviewPage'));
        }
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
