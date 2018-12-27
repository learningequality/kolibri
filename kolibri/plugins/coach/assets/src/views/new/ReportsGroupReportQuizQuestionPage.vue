<template>

  <div>
    <BackLink text="Some quiz" :to="backLink" />
    <h1>Question 1</h1>
    <p>{{ coachStrings.$tr('attemptsLabel') }}</p>
    <p>{{ coachStrings.$tr('showCorrectAnswerLabel') }}</p>
    <p>{{ $tr('summary', {count: 4}) }}</p>
    <h2>{{ coachStrings.$tr('learnersLabel') }}</h2>
    <ul>
      <li><Answer type="noAttempt" /></li>
      <li><Answer type="correct" /></li>
      <li><Answer type="incorrect" /></li>
      <li><Answer type="error" /></li>
      <li><Answer type="hint" /></li>
    </ul>
  </div>

</template>


<script>

  import imports from './imports';

  export default {
    name: 'ReportsGroupReportQuizQuestionPage',
    components: {},
    mixins: [imports],
    computed: {
      backLink() {
        return this.newCoachRoute('ReportsGroupReportQuizQuestionListPage');
      },
    },
    $trs: {
      summary:
        '{count, number, integer} {count, plural, one {learner} other {learners}} got this question incorrect',
    },
  };

</script>


<style lang="scss" scoped></style>
