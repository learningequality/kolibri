<template>

  <div>
    <BackLink text="Counting with big numbers" :to="backLink" />
    <h1>April</h1>
    <ul>
      <li>{{ $tr('masteryModelLabel') }} <MasteryModel /></li>
      <li>
        {{ $tr('statusLabel') }}
        <Completed :showNumber="false" :verbosity="1" />
      </li>
    </ul>
    <p>{{ $tr('answerHistory') }}</p>
    <p>{{ $tr('attempts') }}</p>
    <p>{{ $tr('showCorrectAnswer') }}</p>
    <h2>{{ $tr('questions') }}</h2>
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
  import MasteryModel from './shared/MasteryModel';
  import Completed from './shared/status/Completed';
  import Answer from './shared/Answer';

  export default {
    name: 'ReportsLessonExerciseLearnerPage',
    components: {
      BackLink,
      Answer,
      Completed,
      MasteryModel,
    },
    computed: {
      backLink() {
        return this.newCoachRoute('ReportsLessonExerciseLearnerListPage');
      },
    },
    $trs: {
      masteryModelLabel: 'Completion requirement',
      statusLabel: 'Status',
      answerHistory: 'Answer history',
      attempts: 'Attempts',
      showCorrectAnswer: 'Show correct answer',
      questions: 'Questions',
    },
  };

</script>


<style lang="scss" scoped></style>
