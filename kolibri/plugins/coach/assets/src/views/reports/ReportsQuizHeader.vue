<template>

  <KPageContainer style="padding-top:16px;">
    <BackLink
      :to="classRoute('ReportsQuizListPage')"
      :text="coachString('allQuizzesLabel')"
    />

    <!-- Cheating to get the same layout effect but not
         using a backlink...
    -->
    <BackLinkWithOptions>
      <div slot="backlink">
        <h1>
          <KLabeledIcon icon="quiz" :label="exam.title" />
        </h1>
        <CreatedElapsedTime :date="new Date('2019', '9', '14', '4', '57', '0')" />
      </div>
      <QuizOptionsDropdownMenu
        slot="options"
        optionsFor="report"
        @select="handleSelectOption"
      />
    </BackLinkWithOptions>
  <!-- TODO - Extract to sidebar
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
  -->
  <!-- Move to separate grid piece

  -->
  </KPageContainer>

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

  h1 {
    margin-bottom: 0;
    font-size: 1.5rem;
  }

</style>
