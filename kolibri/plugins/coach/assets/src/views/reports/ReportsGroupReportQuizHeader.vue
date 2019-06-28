<template>

  <div>

    <p>
      <BackLink
        :to="classRoute('ReportsGroupReportPage')"
        :text="group.name"
      />
    </p>
    <h1>
      <KLabeledIcon icon="quiz" :label="exam.title" />
    </h1>

    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">
          {{ coachString('statusLabel') }}
        </template>
        <QuizActive slot="value" :active="exam.active" />
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">
          {{ coachString('avgScoreLabel') }}
        </template>
        <Score slot="value" :value="avgScore" />
      </HeaderTableRow>
      <!-- TODO COACH
      <HeaderTableRow>
        <template slot="key">{{ coachString('questionOrderLabel') }}</template>
        <template slot="value">{{ coachString('orderRandomLabel') }}</template>
      </HeaderTableRow>
       -->
    </HeaderTable>

    <HeaderTabs>
      <HeaderTab
        :text="coachString('reportLabel')"
        :to="classRoute('ReportsGroupReportQuizLearnerListPage')"
      />
      <HeaderTab
        :text="coachString('difficultQuestionsLabel')"
        :to="classRoute('ReportsGroupReportQuizQuestionListPage')"
      />
    </HeaderTabs>

  </div>

</template>


<script>

  import commonCoach from '../common';

  export default {
    name: 'ReportsGroupReportQuizHeader',
    components: {},
    mixins: [commonCoach],
    computed: {
      avgScore() {
        return this.getExamAvgScore(this.$route.params.quizId, this.recipients);
      },
      group() {
        return this.groupMap[this.$route.params.groupId];
      },
      exam() {
        return this.examMap[this.$route.params.quizId];
      },
      recipients() {
        return this.getLearnersForGroups([this.$route.params.groupId]);
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
