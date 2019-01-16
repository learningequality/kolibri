<template>

  <div class="wrapper">
    <h2>{{ detailsString }}</h2>
    <KGrid>
      <KGridItem sizes="100, 100, 50" percentage>
        <KTextbox
          ref="title"
          v-model.trim="examTitle"
          :label="moreStrings.$tr('title')"
          :autofocus="true"
          :maxlength="100"
          :invalid="Boolean(showError && titleIsInvalidText)"
          :invalidText="titleIsInvalidText"
        />
      </KGridItem>
      <KGridItem sizes="100, 100, 50" percentage>
        <KTextbox
          ref="numQuest"
          v-model.trim.number="numQuestions"
          type="number"
          :min="1"
          :max="50"
          :label="moreStrings.$tr('numQuestions')"
          :invalid="Boolean(showError && numQuestIsInvalidText)"
          :invalidText="numQuestIsInvalidText"
          class="number-field"
        />
        <UiIconButton
          type="flat"
          aria-hidden="true"
          class="number-btn"
          @click="numQuestions -= 1"
        >
          <mat-svg name="remove" category="content" />
        </UiIconButton>
        <UiIconButton
          type="flat"
          aria-hidden="true"
          class="number-btn"
          @click="numQuestions += 1"
        >
          <mat-svg name="add" category="content" />
        </UiIconButton>
      </KGridItem>
    </KGrid>
    <div>
      <UiIconButton
        type="flat"
        aria-hidden="true"
        @click="getNewQuestionSet"
      >
        <mat-svg name="refresh" category="navigation" />
      </UiIconButton>
      <KButton
        :text="$tr('randomize')"
        appearance="basic-link"
        :primary="false"
        @click="getNewQuestionSet"
      />
    </div>
    <h2 class="header-margin">{{ $tr('questionOrder') }}</h2>
    <div>
      <KRadioButton
        v-model="fixedOrder"
        :label="coachStrings.$tr('orderRandomLabel')"
        :description="coachStrings.$tr('orderRandomDescription')"
        :value="false"
      />
      <KRadioButton
        v-model="fixedOrder"
        :label="coachStrings.$tr('orderFixedLabel')"
        :description="coachStrings.$tr('orderFixedDescription')"
        :value="true"
      />
    </div>
    <h2 class="header-margin">{{ $tr('questions') }}</h2>
    <KGrid v-if="!loadingNewQuestions">
      <KGridItem sizes="4, 4, 5" class="list-wrapper">
        <ul v-if="fixedOrder" class="question-list">
          <Draggable
            :value="selectedQuestions"
            :options="draggableOptions"
            @input="handleDrag"
            @end="handleEnd"
          >
            <AssessmentQuestionListItem
              v-for="(question, questionIndex) in selectedQuestions"
              :key="questionIndex"
              :draggable="true"
              :isSelected="isSelected(question)"
              :exerciseName="question.title"
              :isCoachContent="Boolean(numCoachContents(question.exercise_id))"
              @click="currentQuestionIndex = questionIndex"
            />
          </Draggable>
        </ul>
        <ul v-else class="question-list">
          <AssessmentQuestionListItem
            v-for="(question, questionIndex) in selectedQuestions"
            :key="questionIndex"
            :draggable="false"
            :isSelected="isSelected(question)"
            :exerciseName="question.title"
            :isCoachContent="Boolean(numCoachContents(question.exercise_id))"
            @click="currentQuestionIndex = questionIndex"
          />
        </ul>
        <ol v-if="fixedOrder" class="numbers">
          <li
            v-for="(question, questionIndex) in selectedQuestions"
            :key="questionIndex"
          ></li>
        </ol>
      </KGridItem>
      <KGridItem sizes="4, 4, 7">
        <h3 class="question-title">{{ currentQuestion.title }}</h3>
        <ContentRenderer
          v-if="content && questionId"
          :id="content.id"
          ref="contentRenderer"
          :kind="content.kind"
          :files="content.files"
          :contentId="content.content_id"
          :available="content.available"
          :extraFields="content.extra_fields"
          :itemId="questionId"
          :assessment="true"
          :allowHints="false"
          :showCorrectAnswer="true"
          :interactive="false"
        />
      </KGridItem>
    </KGrid>
    <Bottom>
      <KRouterLink
        appearance="flat-button"
        :text="coachStrings.$tr('goBackAction')"
        :to="$store.state.toolbarRoute"
      />
      <KButton
        :text="coachStrings.$tr('finishAction')"
        :disabled="loadingNewQuestions"
        primary
        @click="submit"
      />
    </Bottom>
  </div>

</template>


<script>

  import { mapState } from 'vuex';

  import Draggable from 'vuedraggable';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import { coachStringsMixin } from '../../new/shared/commonCoachStrings';
  import QuizDetailEditor from '../../new/shared/QuizDetailEditor';
  import AssessmentQuestionListItem from './AssessmentQuestionListItem';
  import Bottom from './Bottom';
  import CeateExamPage from './index';

  const createExamPageStrings = crossComponentTranslator(CeateExamPage);
  const quizDetailStrings = crossComponentTranslator(QuizDetailEditor);

  export default {
    name: 'CreateExamPreview',
    metaInfo() {
      return {
        title: this.$tr('title'),
      };
    },
    $trs: {
      title: 'Select questions',
      backLabel: 'Select topics or exercises',
      exercise: 'Exercise { num }',
      randomize: 'Choose a different set of questions',
      questionOrder: 'Question order',
      questions: 'Questions',
      newQuestions: 'New question set created',
    },
    components: {
      Draggable,
      UiIconButton,
      ContentRenderer,
      KRouterLink,
      KButton,
      AssessmentQuestionListItem,
      KRadioButton,
      KGrid,
      KGridItem,
      Bottom,
      KTextbox,
    },
    mixins: [responsiveWindow, coachStringsMixin],
    data() {
      return {
        currentQuestionIndex: 0,
        showError: false,
      };
    },
    computed: {
      ...mapState('examCreation', ['selectedQuestions', 'loadingNewQuestions']),
      detailsString() {
        return quizDetailStrings.$tr('details');
      },
      moreStrings() {
        return createExamPageStrings;
      },
      draggableOptions() {
        return {
          animation: 150,
          touchStartThreshold: 3,
          direction: 'vertical',
        };
      },
      currentQuestion() {
        return this.selectedQuestions[this.currentQuestionIndex] || {};
      },
      exercises() {
        const exercises = {};
        this.$store.state.examCreation.selectedExercises.forEach(exercise => {
          exercises[exercise.id] = exercise;
        });
        return exercises;
      },
      content() {
        return this.exercises[this.currentQuestion.exercise_id];
      },
      questionId() {
        return this.currentQuestion.question_id;
      },
      examTitle: {
        get() {
          return this.$store.state.examCreation.title;
        },
        set(value) {
          this.$store.commit('examCreation/SET_TITLE', value);
        },
      },
      numQuestions: {
        get() {
          return this.$store.state.examCreation.numberOfQuestions;
        },
        set(value) {
          this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', value);
          this.$store.dispatch('examCreation/updateSelectedQuestions');
        },
      },
      fixedOrder: {
        get() {
          return this.$store.state.examCreation.learnersSeeFixedOrder;
        },
        set(value) {
          this.$store.commit('examCreation/SET_FIXED_ORDER', value);
        },
      },
      titleIsInvalidText() {
        if (this.examTitle === '') {
          return createExamPageStrings.$tr('examRequiresTitle');
        }
        return null;
      },
      numQuestIsInvalidText() {
        if (this.numQuestions === '') {
          return createExamPageStrings.$tr('numQuestionsBetween');
        }
        if (this.numQuestions < 1 || this.numQuestions > 50) {
          return createExamPageStrings.$tr('numQuestionsBetween');
        }
        if (!Number.isInteger(this.numQuestions)) {
          return createExamPageStrings.$tr('numQuestionsBetween');
        }
        if (this.numQuestions > this.availableQuestions) {
          return createExamPageStrings.$tr('numQuestionsExceed', {
            inputNumQuestions: this.numQuestions,
            maxQuestionsFromSelection: this.availableQuestions,
          });
        }
        return null;
      },
    },
    methods: {
      getNewQuestionSet() {
        this.$store.commit('examCreation/RANDOMIZE_SEED');
        this.$store.dispatch('examCreation/updateSelectedQuestions');
      },
      numCoachContents(exerciseId) {
        return this.exercises[exerciseId].num_coach_contents;
      },
      isSelected(question) {
        return (
          this.currentQuestion.question_id === question.question_id &&
          this.currentQuestion.exercise_id === question.exercise_id
        );
      },
      handleDrag(questions) {
        this.$store.commit('examCreation/SET_SELECTED_QUESTIONS', questions);
      },
      handleEnd(event) {
        this.currentQuestionIndex = event.newIndex;
      },
      submit() {
        if (this.numQuestIsInvalidText) {
          this.showError = true;
          this.$refs.numQuest.focus();
        } else if (this.titleIsInvalidText) {
          this.showError = true;
          this.$refs.title.focus();
        } else {
          this.$store.dispatch('examCreation/createExamAndRoute');
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .number-btn {
    position: relative;
    top: 24px;
  }

  .number-field {
    display: inline-block;
    margin-right: 8px;
  }

  .header-margin {
    margin-top: 32px;
  }

  .list-wrapper {
    position: relative;
  }

  .question-list {
    padding: 0;
    margin-top: 0;
    list-style: none;
  }

  .question-title {
    margin-top: 8px;
    text-align: center;
  }

  .numbers {
    position: absolute;
    top: 0;
    left: 0;
    margin-top: 0;
    font-weight: bold;

    li {
      padding: 8px;
    }
  }

  .sortable-ghost {
    visibility: hidden;
  }

  .sortable-ghost * {
    visibility: hidden;
  }

  .wrapper {
    padding: 16px;
    background-color: white;
  }

</style>
