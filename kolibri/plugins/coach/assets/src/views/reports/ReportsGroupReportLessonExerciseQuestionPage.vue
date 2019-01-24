<template>

  <div>
    <BackLink text="Counting with big numbers" :to="backLink" />
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

  import commonCoach from '../common';

  export default {
    name: 'ReportsGroupReportLessonExerciseQuestionPage',
    components: {},
    mixins: [commonCoach],
    computed: {
      backLink() {
        return this.classRoute('ReportsGroupReportLessonExerciseQuestionListPage', {});
      },
    },
    $trs: {
      allQuestionsLabel: 'All questions',
      summary:
        '{count, number, integer} {count, plural, one {learner} other {learners}} got this question incorrect',
    },
  };

</script>


<style lang="scss" scoped></style>
