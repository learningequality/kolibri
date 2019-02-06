<template>

  <div>

    <p>
      <BackLink
        :to="classRoute('ReportsQuizListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>{{ exam.title }}</h1>

    <!-- COACH TODO
    <KDropdownMenu
      slot="optionsDropdown"
      :text="coachStrings.$tr('optionsLabel')"
      :options="actionOptions"
      appearance="raised-button"
      @select="goTo($event.value)"
    />
     -->

    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('statusLabel') }}</template>
        <QuizActive slot="value" :active="exam.active" />
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('recipientsLabel') }}</template>
        <Recipients slot="value" :groupNames="getGroupNames(exam.groups)" />
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('avgScoreLabel') }}</template>
        <Score slot="value" :value="avgScore" />
      </HeaderTableRow>
      <!-- TODO COACH
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('questionOrderLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('orderRandomLabel') }}</template>
      </HeaderTableRow>
       -->
    </HeaderTable>

    <HeaderTabs>
      <HeaderTab
        :text="coachStrings.$tr('reportLabel')"
        :to="classRoute('ReportsQuizLearnerListPage')"
      />
      <HeaderTab
        :text="coachStrings.$tr('difficultQuestionsLabel')"
        :to="classRoute('ReportsQuizQuestionListPage')"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsQuizHeader',
    components: {},
    mixins: [commonCoach],
    computed: {
      avgScore() {
        return this.getExamAvgScore(this.$route.params.quizId, this.recipients);
      },
      actionOptions() {
        return [
          { label: this.coachStrings.$tr('previewAction'), value: 'ReportsQuizPreviewPage' },
          { label: this.coachStrings.$tr('editDetailsAction'), value: 'ReportsQuizEditorPage' },
        ];
      },
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      recipients() {
        return this.getLearnersForGroups(this.exam.groups);
      },
    },
    $trs: {
      back: 'All quizzes',
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
