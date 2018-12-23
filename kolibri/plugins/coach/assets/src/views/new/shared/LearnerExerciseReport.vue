<template>

  <div>
    <h1>Julie</h1>
    <dl>
      <dt>{{ coachStrings.$tr('masteryModelLabel') }}</dt>
      <dd><MasteryModel /></dd>
      <dt>{{ coachStrings.$tr('statusLabel') }}</dt>
      <dd><Completed :showNumber="false" :verbosity="1" /></dd>
    </dl>
    <p>{{ coachStrings.$tr('answerHistoryLabel') }}</p>
    <p>{{ coachStrings.$tr('attemptsLabel') }}</p>
    <p>{{ coachStrings.$tr('showCorrectAnswerLabel') }}</p>
    <h2>{{ coachStrings.$tr('questionsLabel') }}</h2>
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

  import imports from '../imports';

  export default {
    name: 'LearnerExerciseReport',
    components: {},
    mixins: [imports],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
