<template>

  <div>

    <p>
      <BackLink
        :to="classRoute('ReportsGroupReportPage', {})"
        text="Group A"
      />
    </p>
    <h1>Some quiz</h1>
    <p>{{ $tr('quizPerformanceLabel', {quiz: 'Some quiz'}) }}</p>
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('statusLabel') }}</template>
        <template slot="value"><QuizActive :active="true" /></template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('recipientsLabel') }}</template>
        <template slot="value"><Recipients :groups="[]" /></template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('progressLabel') }}</template>
        <template slot="value">
          <LearnerProgressRatio
            :count="1"
            :total="3"
            :verbosity="1"
            verb="completed"
            icon="clock"
          />
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('questionOrderLabel') }}</template>
        <template slot="value">{{ coachStrings.$tr('orderRandomLabel') }}</template>
      </HeaderTableRow>
    </HeaderTable>

    <HeaderTabs>
      <HeaderTab
        :text="coachStrings.$tr('reportLabel')"
        :to="link('ReportsGroupReportQuizLearnerListPage')"
      />
      <HeaderTab
        :text="coachStrings.$tr('difficultQuestionsLabel')"
        :to="link('ReportsGroupReportQuizQuestionListPage')"
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
    computed: {},
    methods: {
      goTo(page) {
        this.$router.push(this.classRoute(page, {}));
      },
      link(page) {
        return this.classRoute(page, {});
      },
    },
    $trs: {
      back: 'All quizzes',
      quizPerformanceLabel: "'{quiz}' performance",
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
