<template>

  <KPageContainer noPadding>
    <MultiPaneLayout ref="multiPaneLayout">
      <div slot="header">
        <h1 class="title item-detail-section">
          <ContentIcon
            class="item-detail-icons"
            :kind="kind"
            :showTooltip="false"
          />
          {{ title }}
          <CoachContentLabel
            class="item-detail-icons"
            :value="exercise.num_coach_contents || 0"
            :isTopic="false"
          />
        </h1>
      </div>
      <template v-if="learners.length > 0">
        <QuestionDetailLearnerList
          slot="aside"
          :learners="learners"
          :selectedLearnerNumber="learnerIndex"
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
            :itemId="currentLearner.item"
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
  import InteractionList from 'kolibri.coreVue.components.InteractionList';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../common';
  import QuestionDetailLearnerList from './QuestionDetailLearnerList';

  export default {
    name: 'QuestionLearnersReport',
    components: {
      QuestionDetailLearnerList,
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
      ...mapState('questionDetail', [
        'exercise',
        'interactionIndex',
        'learnerId',
        'questionId',
        'title',
      ]),
      ...mapGetters('questionDetail', [
        'currentLearner',
        'currentInteraction',
        'currentInteractionHistory',
        'learners',
        'learnerIndex',
        'kind',
      ]),
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
      navigateToNewAttempt(learnerIndex) {
        this.showCorrectAnswer = false;
        const learnerId = this.learners[learnerIndex].id;
        this.$emit('navigate', {
          questionId: this.questionId,
          learnerId,
          interactionIndex: 0,
        });
        this.$refs.multiPaneLayout.scrollMainToTop();
      },
      navigateToNewInteraction(interactionIndex) {
        this.$emit('navigate', {
          questionId: this.questionId,
          learnerId: this.learnerId,
          interactionIndex,
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
    h3 {
      margin-top: 0;
    }
  }

  .title {
    margin-bottom: 0;
  }

  .item-detail-section {
    display: inline-block;
    margin-top: 0;
  }

  .item-detail-icons {
    position: relative;
    top: -2px;
  }

</style>
