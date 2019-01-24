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
    <dl>
      <dt>{{ coachStrings.$tr('statusLabel') }}</dt>
      <dd><QuizActive :active="true" /></dd>
      <dt>{{ coachStrings.$tr('recipientsLabel') }}</dt>
      <dd><Recipients :groups="[]" /></dd>
      <dt>{{ coachStrings.$tr('progressLabel') }}</dt>
      <dd>
        <LearnerProgressRatio
          :count="1"
          :total="3"
          :verbosity="1"
          verb="completed"
          icon="clock"
        />
      </dd>
      <dt>{{ coachStrings.$tr('questionOrderLabel') }}</dt>
      <dd>{{ coachStrings.$tr('orderRandomLabel') }}</dd>
    </dl>

    <div>
      <KRouterLink
        :text="coachStrings.$tr('reportLabel')"
        appearance="flat-button"
        class="new-coach-tab"
        :to="link('ReportsGroupReportQuizLearnerListPage')"
      />
      <KRouterLink
        :text="coachStrings.$tr('difficultQuestionsLabel')"
        appearance="flat-button"
        class="new-coach-tab"

        :to="link('ReportsGroupReportQuizQuestionListPage')"
      />
    </div>

    <hr>

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
