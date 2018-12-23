<template>

  <div>
    <BackLink text="Counting with big numbers" :to="backLink" />
    <h1>April</h1>
    <ul>
      <li>{{ coachStrings.$tr('masteryModelLabel') }} <MasteryModel /></li>
      <li>
        {{ coachStrings.$tr('statusLabel') }}
        <Completed :showNumber="false" :verbosity="1" />
      </li>
    </ul>
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

  import imports from './imports';

  export default {
    name: 'ReportsLessonExerciseLearnerPage',
    components: {},
    mixins: [imports],
    computed: {
      backLink() {
        return this.newCoachRoute('ReportsLessonExerciseLearnerListPage');
      },
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
