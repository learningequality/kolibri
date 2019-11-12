<template>

  <KPageContainer noPadding>
    <MultiPaneLayout ref="multiPaneLayout">
      <div slot="header">
        <h1 class="learner-name">
          {{ learner.name }}
        </h1>
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
            <template slot="key">
              {{ coachString('masteryModelLabel') }}
            </template>
            <template slot="value">
              <MasteryModel />
            </template>
          </HeaderTableRow>
          <HeaderTableRow>
            <template slot="key">
              {{ coachString('statusLabel') }}
            </template>
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
        <div
          slot="main"
          class="exercise-section"
          :style="{ backgroundColor: $themeTokens.surface }"
        >
          <KCheckbox
            :label="coreString('showCorrectAnswerLabel')"
            :checked="showCorrectAnswer"
            @change="toggleShowCorrectAnswer"
          />
          <InteractionList
            v-if="!showCorrectAnswer"
            :interactions="currentInteractionHistory"
            :selectedInteractionIndex="interactionIndex"
            @select="navigateToNewInteraction($event)"
          />
          <KContentRenderer
            v-if="currentInteraction"
            :itemId="currentAttemptLog.item"
            :assessment="true"
            :allowHints="false"
            :kind="exercise.kind"
            :files="exercise.files"
            :available="exercise.available"
            :answerState="answerState"
            :showCorrectAnswer="showCorrectAnswer"
            :interactive="false"
            :extraFields="exercise.extra_fields"
          />
        </div>
      </template>
    </MultiPaneLayout>
  </KPageContainer>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import AttemptLogList from 'kolibri.coreVue.components.AttemptLogList';
  import InteractionList from 'kolibri.coreVue.components.InteractionList';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';

  export default {
    name: 'LearnerExerciseReport',
    components: {
      AttemptLogList,
      InteractionList,
      MultiPaneLayout,
      CoachContentLabel,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        showCorrectAnswer: false,
      };
    },
    computed: {
      ...mapGetters('exerciseDetail', [
        'currentAttemptLog',
        'currentInteraction',
        'currentInteractionHistory',
        'attemptLogs',
        'attemptLogIndex',
      ]),
      ...mapGetters('classSummary', ['getContentStatusObjForLearner']),
      ...mapState('classSummary', ['learnerMap']),
      ...mapState('exerciseDetail', ['attemptId', 'exercise', 'interactionIndex', 'learnerId']),
      status() {
        return this.getContentStatusObjForLearner(this.exercise.content_id, this.learnerId).status;
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
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  .exercise-section {
    padding: 16px;
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
