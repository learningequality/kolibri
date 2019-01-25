<template>

  <div>
    <h1>Julie</h1>
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('masteryModelLabel') }}</template>
        <template slot="value"><MasteryModel /></template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ coachStrings.$tr('statusLabel') }}</template>
        <template slot="value">
          <LearnerProgressLabel
            :count="1"
            :verbosity="1"
            verb="completed"
            icon="star"
          />
        </template>
      </HeaderTableRow>
    </HeaderTable>
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
