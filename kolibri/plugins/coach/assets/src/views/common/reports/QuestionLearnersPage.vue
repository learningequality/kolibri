<template>

  <CoachImmersivePage
    :appBarTitle="title"
    icon="back"
    :pageTitle="title"
    :primary="false"
    :route="toolbarRoute"
  >
    <KPageContainer :topMargin="0">
      <MultiPaneLayout ref="multiPaneLayout">
        <template #header>
          <div>
            <h1 class="item-detail-section title">
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
        </template>

        <template
          v-if="learners.length > 0"
          #aside
        >
          <QuestionDetailLearnerList
            :learners="learners"
            :selectedLearnerNumber="learnerIndex"
            @select="navigateToNewAttempt($event)"
          />
        </template>
        <template
          v-if="learners.length > 0"
          #main
        >
          <div
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
            <ContentRenderer
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
  </CoachImmersivePage>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import InteractionList from 'kolibri-common/components/quizzes/InteractionList';
  import MultiPaneLayout from 'kolibri-common/components/MultiPaneLayout';
  import CoachContentLabel from 'kolibri-common/components/labels/CoachContentLabel';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonCoach from '../../common';
  import CoachImmersivePage from '../../CoachImmersivePage';
  import QuestionDetailLearnerList from '../QuestionDetailLearnerList';
  import { PageNames } from '../../../constants';

  export default {
    name: 'QuestionLearnersReport',
    components: {
      QuestionDetailLearnerList,
      InteractionList,
      MultiPaneLayout,
      CoachContentLabel,
      CoachImmersivePage,
    },
    mixins: [commonCoach, commonCoreStrings],
    data() {
      return {
        prevRoute: null,
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
      toolbarRoute() {
        return (
          this.prevRoute ||
          this.classRoute(PageNames.EXAM_SUMMARY, { tabId: 'tabDifficultQuestions' })
        );
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        vm.prevRoute = from;
      });
    },
    methods: {
      navigateToNewAttempt(learnerIndex) {
        this.showCorrectAnswer = false;
        const learnerId = this.learners[learnerIndex].id;
        this.navigate({
          questionId: this.questionId,
          learnerId,
          interactionIndex: 0,
        });
        this.$refs.multiPaneLayout.scrollMainToTop();
      },
      navigateToNewInteraction(interactionIndex) {
        this.navigate({
          questionId: this.questionId,
          learnerId: this.learnerId,
          interactionIndex,
        });
      },
      navigate(params) {
        this.$router.push({
          name: this.name,
          params: {
            classId: this.$route.params.classId,
            quizId: this.$route.params.quizId,
            lessonId: this.$route.params.lessonId,
            groupId: this.$route.params.groupId,
            ...params,
          },
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
