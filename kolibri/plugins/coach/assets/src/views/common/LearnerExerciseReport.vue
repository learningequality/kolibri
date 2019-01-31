<template>

  <MultiPaneLayout ref="multiPaneLayout">
    <div slot="header">
      <h1>{{ learner.name }}</h1>
      <HeaderTable>
        <HeaderTableRow>
          <template slot="key">{{ coachStrings.$tr('masteryModelLabel') }}</template>
          <template slot="value"><MasteryModel /></template>
        </HeaderTableRow>
        <HeaderTableRow>
          <template slot="key">{{ coachStrings.$tr('statusLabel') }}</template>
          <template slot="value">
            <LearnerProgressLabel
              v-if="!status || status === STATUSES.notStarted"
              :count="1"
              :verbosity="1"
              :verb="VERBS.notStarted"
              :icon="ICONS.nothing"
            />
            <LearnerProgressLabel
              v-else-if="status === STATUSES.started"
              :count="1"
              :verbosity="1"
              :verb="VERBS.started"
              :icon="ICONS.clock"
            />
            <LearnerProgressLabel
              v-else-if="status === STATUSES.completed"
              :count="1"
              :verbosity="1"
              :verb="VERBS.completed"
              :icon="ICONS.star"
            />
            <LearnerProgressLabel
              v-else-if="status === STATUSES.helpNeeded"
              :count="1"
              :verbosity="1"
              :verb="VERBS.needHelp"
              :icon="ICONS.star"
            />
          </template>
        </HeaderTableRow>
      </HeaderTable>
    </div>
    <template v-if="attemptLogs.length > 0">
      <AttemptLogList
        slot="aside"
        :attemptLogs="attemptLogs"
        :selectedQuestionNumber="attemptLogIndex"
        @select="navigateToNewAttempt($event)"
      />
      <div slot="main" class="exercise-section" :style="{ backgroundColor: $coreBgLight }">
        <KCheckbox
          :label="coachStrings.$tr('showCorrectAnswerLabel')"
          :checked="showCorrectAnswer"
          @change="toggleShowCorrectAnswer"
        />
        <InteractionList
          v-if="!showCorrectAnswer"
          :interactions="currentInteractionHistory"
          :selectedInteractionIndex="interactionIndex"
          @select="navigateToNewInteraction($event)"
        />
        <ContentRenderer
          v-if="currentInteraction"
          :id="exercise.id"
          :itemId="currentAttemptLog.item"
          :assessment="true"
          :allowHints="false"
          :kind="exercise.kind"
          :files="exercise.files"
          :contentId="exercise.content_id"
          :available="exercise.available"
          :answerState="answerState"
          :showCorrectAnswer="showCorrectAnswer"
          :interactive="false"
          :extraFields="exercise.extra_fields"
        />
      </div>
    </template>
    <p>{{ coachStrings.$tr('answerHistoryLabel') }}</p>
    <p>{{ coachStrings.$tr('attemptsLabel') }}</p>
    <h2>{{ coachStrings.$tr('questionsLabel') }}</h2>
    <ul>
      <li><Answer type="noAttempt" /></li>
      <li><Answer type="correct" /></li>
      <li><Answer type="incorrect" /></li>
      <li><Answer type="error" /></li>
      <li><Answer type="hint" /></li>
    </ul>
  </MultiPaneLayout>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import AttemptLogList from 'kolibri.coreVue.components.AttemptLogList';
  import InteractionList from 'kolibri.coreVue.components.InteractionList';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import commonCoach from '../common';

  export default {
    name: 'LearnerExerciseReport',
    components: {
      ContentRenderer,
      AttemptLogList,
      InteractionList,
      KCheckbox,
      MultiPaneLayout,
    },
    mixins: [commonCoach],
    $trs: {},
    data() {
      return {
        showCorrectAnswer: false,
      };
    },
    computed: {
      ...mapGetters(['$coreBgLight']),
      ...mapGetters('exerciseDetail', [
        'currentAttemptLog',
        'currentInteraction',
        'currentInteractionHistory',
        'attemptLogs',
        'attemptLogIndex',
      ]),
      ...mapGetters('classSummary', ['getContentStatusForLearner']),
      ...mapState('classSummary', ['learnerMap']),
      ...mapState('exerciseDetail', ['attemptId', 'exercise', 'interactionIndex', 'learnerId']),
      status() {
        return this.getContentStatusForLearner(this.exercise.content_id, this.learnerId);
      },
      learner() {
        return this.learnerMap[this.learnerId];
      },
      // Do not pass in answerState if showCorrectAnswer is set to true
      // answerState has a precedence over showCorrectAnswer
      answerState() {
        if (
          !this.showCorrectAnswer &&
          this.currentInteraction &&
          this.currentInteraction.type === 'answer'
        ) {
          return this.currentInteraction.answer;
        }
        return null;
      },
    },
    methods: {
      navigateToNewAttempt(attemptLogIndex) {
        this.showCorrectAnswer = false;
        this.$emit('navigate', {
          exerciseId: this.exercise.id,
          learnerId: this.learnerId,
          interactionIndex: 0,
          attemptId: this.attemptLogs[attemptLogIndex].id,
        });
        this.$refs.multiPaneLayout.scrollMainToTop();
      },
      navigateToNewInteraction(interactionIndex) {
        this.$emit('navigate', {
          exerciseId: this.exercise.id,
          learnerId: this.learnerId,
          interactionIndex,
          attemptId: this.attemptId,
        });
      },
      toggleShowCorrectAnswer() {
        this.showCorrectAnswer = !this.showCorrectAnswer;
        this.$forceUpdate();
      },
    },
  };

</script>


<style lang="scss" scoped>

  .exercise-section {
    padding: 16px;
    h3 {
      margin-top: 0;
    }
  }

</style>
