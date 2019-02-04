<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    immersivePagePrimary
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="coachStrings.$tr('coachLabel')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
  >

    <div class="new-coach-block">
      <h1>{{ previewQuizStrings.$tr('preview') }}</h1>
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
            :max="maxQs"
            :label="moreStrings.$tr('numQuestions')"
            :invalid="Boolean(showError && numQuestIsInvalidText)"
            :invalidText="numQuestIsInvalidText"
            class="number-field"
          />
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === 1"
            @click="numQuestions -= 1"
          >
            <mat-svg name="remove" category="content" />
          </UiIconButton>
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === maxQs"
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
          tabindex="-1"
          color="primary"
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
          <KDragContainer
            v-if="fixedOrder"
            :items="annotatedQuestions"
            @sort="handleUserSort"
          >
            <transition-group tag="ol" name="list" class="question-list">
              <KDraggable
                v-for="(question, questionIndex) in annotatedQuestions"
                :key="listKey(question)"
              >
                <KDragHandle>
                  <AssessmentQuestionListItem
                    :draggable="true"
                    :isSelected="isSelected(question)"
                    :exerciseName="question.title"
                    :isCoachContent="Boolean(numCoachContents(question.exercise_id))"
                    :questionNumberOfExercise="question.counterInExercise"
                    :isFirst="questionIndex === 0"
                    :isLast="questionIndex === annotatedQuestions.length - 1"
                    @select="currentQuestionIndex = questionIndex"
                    @moveDown="moveQuestionDown(questionIndex)"
                    @moveUp="moveQuestionUp(questionIndex)"
                  />
                </KDragHandle>
              </KDraggable>
            </transition-group>
          </KDragContainer>
          <ul v-else class="question-list">
            <AssessmentQuestionListItem
              v-for="(question, questionIndex) in annotatedQuestions"
              :key="listKey(question)"
              :draggable="false"
              :isSelected="isSelected(question)"
              :exerciseName="question.title"
              :isCoachContent="Boolean(numCoachContents(question.exercise_id))"
              :questionNumberOfExercise="question.counterInExercise"
              @select="currentQuestionIndex = questionIndex"
            />
          </ul>
          <transition name="fade-numbers">
            <ol v-if="fixedOrder" class="list-labels" aria-hidden>
              <li
                v-for="(question, questionIndex) in selectedQuestions"
                :key="questionIndex"
              ></li>
            </ol>
            <ul v-else class="list-labels" aria-hidden>
              <li
                v-for="(question, questionIndex) in selectedQuestions"
                :key="questionIndex"
              ></li>
            </ul>
          </transition>
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
          :to="toolbarRoute"
        />
        <KButton
          :text="coachStrings.$tr('finishAction')"
          :disabled="loadingNewQuestions"
          primary
          @click="submit"
        />
      </Bottom>
    </div>

  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KDragContainer from 'kolibri.coreVue.components.KDragContainer';
  import KDraggable from 'kolibri.coreVue.components.KDraggable';
  import KDragHandle from 'kolibri.coreVue.components.KDragHandle';
  import commonCoach from '../../common';
  import QuizDetailEditor from '../../common/QuizDetailEditor';
  import ExamPreview from '../CoachExamsPage/ExamPreview';
  import { MAX_QUESTIONS } from '../../../constants/examConstants';
  import AssessmentQuestionListItem from './AssessmentQuestionListItem';
  import Bottom from './Bottom';
  import CeateExamPage from './index';

  const createExamPageStrings = crossComponentTranslator(CeateExamPage);
  const quizDetailStrings = crossComponentTranslator(QuizDetailEditor);
  const previewQuizStrings = crossComponentTranslator(ExamPreview);

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
      KDraggable,
      KDragContainer,
      KDragHandle,
    },
    mixins: [responsiveWindow, commonCoach],
    data() {
      return {
        currentQuestionIndex: 0,
        showError: false,
      };
    },
    computed: {
      ...mapState(['toolbarRoute']),
      ...mapState('examCreation', [
        'loadingNewQuestions',
        'selectedQuestions',
        'selectedExercises',
      ]),
      annotatedQuestions() {
        const counts = {};
        const totals = {};
        this.selectedQuestions.forEach(question => {
          if (!totals[question.exercise_id]) {
            totals[question.exercise_id] = 0;
          }
          totals[question.exercise_id] += 1;
          counts[this.listKey(question)] = totals[question.exercise_id];
        });
        return this.selectedQuestions.map(question => {
          if (totals[question.exercise_id] > 1) {
            question.counterInExercise = counts[this.listKey(question)];
          }
          return question;
        });
      },
      maxQs() {
        return MAX_QUESTIONS;
      },
      detailsString() {
        return quizDetailStrings.$tr('details');
      },
      moreStrings() {
        return createExamPageStrings;
      },
      previewQuizStrings() {
        return previewQuizStrings;
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
      content() {
        return this.selectedExercises[this.currentQuestion.exercise_id];
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
          if (value && value >= 1 && value <= this.maxQs) {
            this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', value);
            this.$store.dispatch('examCreation/updateSelectedQuestions');
          }
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
      handleUserSort({ newArray, newIndex, oldIndex }) {
        this.$store.commit('examCreation/SET_SELECTED_QUESTIONS', newArray);
        if (this.isSelected(this.selectedQuestions[oldIndex])) {
          // switch immediately
          this.currentQuestionIndex = newIndex;
        } else {
          // wait for the bounce animation to complete before switching
          setTimeout(() => {
            this.currentQuestionIndex = newIndex;
          }, 250);
        }
      },
      shiftOne(oldIndex, newIndex) {
        const newArray = [...this.selectedQuestions];
        newArray[oldIndex] = this.selectedQuestions[newIndex];
        newArray[newIndex] = this.selectedQuestions[oldIndex];
        this.handleUserSort({ newArray, oldIndex, newIndex });
      },
      moveQuestionUp(index) {
        this.shiftOne(index, index - 1);
      },
      moveQuestionDown(index) {
        this.shiftOne(index, index + 1);
      },
      getNewQuestionSet() {
        this.$store.commit('examCreation/RANDOMIZE_SEED');
        this.$store.dispatch('examCreation/updateSelectedQuestions');
      },
      numCoachContents(exerciseId) {
        return this.selectedExercises[exerciseId].num_coach_contents;
      },
      isSelected(question) {
        return (
          this.currentQuestion.question_id === question.question_id &&
          this.currentQuestion.exercise_id === question.exercise_id
        );
      },
      submit() {
        if (this.numQuestIsInvalidText) {
          this.showError = true;
          this.$refs.numQuest.focus();
        } else if (this.titleIsInvalidText) {
          this.showError = true;
          this.$refs.title.focus();
        } else {
          this.$store.dispatch('examCreation/createExamAndRoute', this.classId);
        }
      },
      listKey(question) {
        return question.exercise_id + question.question_id;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .number-field {
    display: inline-block;
    margin-right: 8px;
  }

  .number-btn {
    position: relative;
    top: 16px;
    display: inline-block;
    vertical-align: top;
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
    margin-left: 40px;
    list-style: none;
  }

  .question-title {
    margin-top: 8px;
    text-align: center;
  }

  .list-labels {
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

  .fade-numbers-enter-active {
    transition: opacity $core-time;
  }

  .fade-numbers-enter {
    opacity: 0;
  }

  .list-move {
    transition: transform $core-time ease;
  }

</style>
