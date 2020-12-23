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
      <HeaderTableRow v-if="$isPrint">
        <template #key>
          {{ coachString('groupNameLabel') }}
        </template>
        <template #value>
          {{ group.name }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow v-show="!$isPrint">
        <template #key>
          {{ coachString('statusLabel') }}
        </template>
        <template #value>
          <QuizActive :active="exam.active" />
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template #key>
          {{ coachString('avgScoreLabel') }}
        </template>
        <template #value>
          <Score :value="avgScore" />
        </template>
      </HeaderTableRow>
    </HeaderTable>

    <HeaderTabs :enablePrint="true">
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
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
