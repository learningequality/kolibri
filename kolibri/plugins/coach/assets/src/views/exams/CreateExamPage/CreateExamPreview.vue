<template>

  <KModal
    ref="modal"
    :title="$tr('title')"
    :cancelText="$tr('back')"
    :submitText="$tr('finish')"
    size="large"
    :width="`${windowWidth - 16}px`"
    :height="`${windowHeight - 16}px`"
    @submit="submit"
    @cancel="close"
  >
    <transition mode="out-in">
      <KCircularLoader
        v-if="loading"
        :delay="false"
      />
      <div v-else-if="exerciseContentNodes.length === 0" class="no-exercise-x">
        <mat-svg category="navigation" name="close" />
      </div>
      <div v-else @keyup.enter.stop>
        <div ref="header">
          <h2>{{ $tr('questionOrder') }}</h2>
          <div>
            <KRadioButton
              v-model="isRandom"
              :label="$tr('randomizedLabel')"
              :description="$tr('randomizedDescription')"
              :value="true"
            />
            <KRadioButton
              v-model="isRandom"
              :label="$tr('fixedLabel')"
              :description="$tr('fixedDescription')"
              :value="false"
            />
          </div>
          <h2>{{ $tr('questions') }}</h2>
        </div>
        <KGrid class="exam-preview-container">
          <KGridItem
            sizes="1, 3, 4"
            :style="{ maxHeight: `${maxHeight}px` }"
            class="o-y-auto"
          >
            <div>
              {{ $tr('numQuestions', { num: availableExamQuestionSources.length }) }}
            </div>
            <div>
              <KButton
                :text="$tr('randomize')"
                appearance="basic-link"
                :primary="false"
                class="randomize-btn"
                @click="$emit('randomize')"
              />
            </div>
            <div
              v-for="(exercise, exerciseIndex) in availableExamQuestionSources"
              :key="exerciseIndex"
            >
              <ol class="question-list">
                <AssessmentQuestionListItem
                  v-for="(question, questionIndex) in getExerciseQuestions(exercise.exercise_id)"
                  :key="questionIndex"
                  :questionNumberWithinExam="getQuestionIndex(question.itemId, exercise.exercise_id) + 1"
                  :questionNumberWithinExercise="questionIndex"
                  :totalFromExercise="availableExamQuestionSources.length"
                  :isSelected="isSelected(question.itemId, exercise.exercise_id)"
                  :exerciseName="getExerciseName(exercise.exercise_id)"
                  :isCoachContent="Boolean(numCoachContents(exercise))"
                  @click="goToQuestion(question.itemId, exercise.exercise_id)"
                />
              </ol>
            </div>
          </KGridItem>
          <KGridItem
            sizes="3, 5, 8"
            :style="{ maxHeight: `${maxHeight}px` }"
            class="o-y-auto"
          >
            <ContentRenderer
              v-if="content && itemId"
              :id="content.id"
              ref="contentRenderer"
              :kind="content.kind"
              :files="content.files"
              :contentId="content.content_id"
              :available="content.available"
              :extraFields="content.extra_fields"
              :itemId="itemId"
              :assessment="true"
              :allowHints="false"
              :showCorrectAnswer="true"
              :interactive="false"
            />
          </KGridItem>
        </KGrid>
      </div>
    </transition>
  </KModal>

</template>


<script>

  import find from 'lodash/find';
  import { ContentNodeResource } from 'kolibri.resources';
  import { createQuestionList, selectQuestionFromExercise } from 'kolibri.utils.exams';
  import KModal from 'kolibri.coreVue.components.KModal';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import debounce from 'lodash/debounce';
  import AssessmentQuestionListItem from '../AssessmentQuestionListItem';

  export default {
    name: 'CreateExamPreview',
    $trs: {
      title: 'Select questions',
      back: 'Go back',
      finish: 'Finish',
      numQuestions: '{num} {num, plural, one {question} other {questions}}',
      exercise: 'Exercise { num }',
      randomize: 'Choose a different set of questions',
      questionOrder: 'Question order',
      questions: 'Questions',
      randomizedLabel: 'Randomized',
      randomizedDescription: 'Each learner sees a different question order',
      fixedLabel: 'Fixed',
      fixedDescription: 'Each learner sees the same question order',
      newQuestions: 'New question set created',
    },
    components: {
      KModal,
      ContentRenderer,
      KButton,
      AssessmentQuestionListItem,
      KRadioButton,
      KGrid,
      KGridItem,
      KCircularLoader,
    },
    mixins: [responsiveWindow],
    props: {
      examQuestionSources: {
        type: Array,
        required: true,
      },
      examSeed: {
        type: Number,
        required: true,
      },
      examNumQuestions: {
        type: Number,
        required: true,
      },
      exerciseContentNodes: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        currentQuestionIndex: 0,
        exercises: {},
        loading: true,
        maxHeight: null,
        questions: [],
        isRandom: true,
      };
    },
    computed: {
      debouncedSetMaxHeight() {
        return debounce(this.setMaxHeight, 250);
      },
      availableExamQuestionSources() {
        return this.examQuestionSources.filter(questionSource => {
          return this.exercises[questionSource.exercise_id];
        });
      },
      currentQuestion() {
        return this.questions[this.currentQuestionIndex] || {};
      },
      content() {
        return this.exercises[this.currentQuestion.contentId];
      },
      itemId() {
        return this.currentQuestion.itemId;
      },
    },
    watch: {
      examQuestionSources: {
        handler: 'resetPreview',
        immediate: true,
      },
    },
    updated() {
      this.debouncedSetMaxHeight();
    },
    methods: {
      setMaxHeight() {
        const title = this.$refs.modal.$el.querySelector('#modal-title');
        const header = this.$refs.header;
        if (title && header) {
          const titleHeight = title.clientHeight;
          const headerHeight = header.clientHeight;
          const closeBtnHeight = 44;
          const margins = 16 * 6;
          this.maxHeight =
            this.windowHeight - titleHeight - headerHeight - closeBtnHeight - margins;
        }
      },
      numCoachContents(exercise) {
        return find(this.exerciseContentNodes, { id: exercise.exercise_id }).num_coach_contents;
      },
      resetPreview() {
        // Serially update data.exercises, then data.questions
        return this.setExercises().then(() => {
          this.setQuestions();
        });
      },
      setQuestions() {
        if (Object.keys(this.exercises).length === 0) {
          this.questions = [];
        } else {
          this.questions = createQuestionList(this.availableExamQuestionSources).map(question => ({
            itemId: selectQuestionFromExercise(
              question.assessmentItemIndex,
              this.examSeed,
              this.exercises[question.contentId]
            ),
            contentId: question.contentId,
            title: question.title,
          }));
        }
      },
      setExercises() {
        this.loading = true;
        return ContentNodeResource.fetchCollection({
          getParams: {
            ids: this.examQuestionSources.map(item => item.exercise_id),
          },
        }).then(contentNodes => {
          contentNodes.forEach(node => {
            this.$set(this.exercises, node.id, node);
          });
          this.loading = false;
        });
      },
      isSelected(questionItemId, exerciseId) {
        return (
          this.currentQuestion.itemId === questionItemId &&
          this.currentQuestion.contentId === exerciseId
        );
      },
      getQuestionIndex(questionItemId, exerciseId) {
        return this.questions.findIndex(
          question => question.itemId === questionItemId && question.contentId === exerciseId
        );
      },
      goToQuestion(questionItemId, exerciseId) {
        this.currentQuestionIndex = this.getQuestionIndex(questionItemId, exerciseId);
      },
      getExerciseName(exerciseId) {
        if (this.exercises[exerciseId]) {
          return this.exercises[exerciseId].title;
        }
        return '';
      },
      close() {
        this.$emit('close');
      },
      submit() {
        this.$emit('submit');
      },
      getExerciseQuestions(exerciseId) {
        return this.questions.filter(q => q.contentId === exerciseId);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .exam-preview-container {
    margin-top: 16px;
  }

  /deep/ .modal {
    max-width: unset;
    max-height: unset;
  }

  ol {
    padding: 0;
    margin: 0;
  }

  h3 {
    margin-top: 1em;
    margin-bottom: 0.25em;
  }

  .no-exercise-x {
    text-align: center;
    svg {
      width: 200px;
      height: 200px;
    }
  }

  .o-y-auto {
    overflow-y: auto;
  }

  .randomize-btn {
    margin: 0 0 0 8px;
  }

</style>
