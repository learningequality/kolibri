<template>

  <div>
    <BackLink text="Some quiz" :to="backLink" />
    <h1>Adam</h1>

    <dl>
      <dt>{{ $tr('overallScore') }}</dt>
      <dd><Score :value="0.5" /></dd>
      <dt>{{ $tr('questionsCorrect') }}</dt>
      <dd>{{ coachStrings.$tr('ratio', {count:10, total: 12}) }}</dd>
    </dl>

    <p>{{ $tr('answers') }}</p>
    <p>{{ $tr('attempts') }}</p>
    <p>{{ $tr('showCorrectAnswer') }}</p>
    <h2>{{ $tr('answers') }}</h2>
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
    name: 'ReportsQuizLearnerPage',
    components: {},
    mixins: [imports],
    computed: {
      backLink() {
        return {
          name: 'NEW_COACH_PAGES',
          params: { page: 'ReportsQuizLearnerListPage' },
        };
      },
    },
    $trs: {
      overallScore: 'Overall score',
      questionsCorrect: 'Questions correct',
      answers: 'Answers',
      showCorrectAnswer: 'Show correct answer',
    },
  };

</script>


<style lang="scss" scoped></style>
