<template>

  <MultiPaneLayout ref="multiPaneLayout">
    <div slot="header">
      <h1 class="learner-name">{{ learner.name }}</h1>
      <p class="exercise-detail-section">
        <ContentIcon
          class="exercise-detail-icons"
          :kind="ContentNodeKinds.EXERCISE"
          :showTooltip="false"
        />
        {{ exercise.title }}
        <CoachContentLabel
          class="exercise-detail-icons"
          :value="exercise.num_coach_contents || 0"
          :isTopic="false"
        />
      </p>
      <HeaderTable>
        <HeaderTableRow>
          <template slot="key">{{ coachStrings.$tr('masteryModelLabel') }}</template>
          <template slot="value"><MasteryModel /></template>
        </HeaderTableRow>
        <HeaderTableRow>
          <template slot="key">{{ coachStrings.$tr('statusLabel') }}</template>
          <template slot="value">
            <StatusSimple :status="status" />
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
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import commonCoach from '../common';

  export default {
    name: 'LearnerExerciseReport',
    components: {
      ContentRenderer,
      AttemptLogList,
      InteractionList,
      KCheckbox,
      MultiPaneLayout,
      CoachContentLabel,
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
          exerciseId: this.exercise.content_id,
          learnerId: this.learnerId,
          interactionIndex: 0,
          attemptId: this.attemptLogs[attemptLogIndex].id,
        });
        this.$refs.multiPaneLayout.scrollMainToTop();
      },
      navigateToNewInteraction(interactionIndex) {
        this.$emit('navigate', {
          exerciseId: this.exercise.content_id,
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

  .learner-name {
    margin-bottom: 0;
  }

  .exercise-detail-section {
    display: inline-block;
    margin-top: 0;
  }

  .exercise-detail-icons {
    position: relative;
    top: -2px;
  }

</style>
