<template>

  <div>
    <h1>Julie</h1>
    <dl>
      <dt>{{ coachStrings.$tr('masteryModelLabel') }}</dt>
      <dd><MasteryModel /></dd>
      <dt>{{ coachStrings.$tr('statusLabel') }}</dt>
      <dd>
        <LearnerProgressLabel
          :count="1"
          :verbosity="1"
          verb="completed"
          icon="star"
        />
      </dd>
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

  import commonCoach from '../common';

  export default {
    name: 'LearnerExerciseReport',
    components: {},
    mixins: [commonCoach],
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
