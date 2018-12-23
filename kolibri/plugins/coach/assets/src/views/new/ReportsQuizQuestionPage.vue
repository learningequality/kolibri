<template>

  <div>
    <BackLink text="Some quiz" :to="backLink" />
    <h1>Question 1</h1>
    <p>{{ $tr('attempts') }}</p>
    <p>{{ $tr('showCorrectAnswer') }}</p>
    <p>{{ $tr('summary', {count: 4}) }}</p>
    <h2>{{ $tr('learners') }}</h2>
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

  import BackLink from './shared/BackLink';
  import Answer from './shared/Answer';

  export default {
    name: 'ReportsQuizQuestionPage',
    components: {
      BackLink,
      Answer,
    },
    computed: {
      backLink() {
        return this.newCoachRoute('ReportsQuizQuestionListPage');
      },
    },
    $trs: {
      attempts: 'Attempts',
      showCorrectAnswer: 'Show correct answer',
      learners: 'Learners',
      summary:
        '{count, number, integer} {count, plural, one {learner} other {learners}} got this question incorrect',
    },
  };

</script>


<style lang="scss" scoped></style>
