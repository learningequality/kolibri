<template>

  <core-modal
    ref="modal"
    :title="$tr('preview')"
    @cancel="close"
    :width="`${windowSize.width - 16}px`"
    :height="`${windowSize.height - 16}px`"
  >
    <transition mode="out-in">
      <k-circular-loader
        v-if="loading"
        :delay="false"
      />
      <div class="no-exercise-x" v-else-if="exerciseContentNodes.length === 0">
        <mat-svg category="navigation" name="close" />
      </div>
      <div v-else>
        <div ref="header">
          <strong>{{ $tr('numQuestions', { num: availableExamQuestionSources.length }) }}</strong>
          <slot name="randomize-button"></slot>
        </div>
        <k-grid
          class="exam-preview-container"
          :style="{ maxHeight: `${maxHeight}px` }"
        >
          <k-grid-item size="1" cols="3" class="question-selector">
            <div
              v-for="(exercise, exerciseIndex) in availableExamQuestionSources"
              :key="exerciseIndex"
            >
              <h3 v-if="examCreation">{{ getExerciseName(exercise.exercise_id) }}</h3>
              <ol class="question-list">
                <li
                  class="question-list-item"
                  v-for="(question, questionIndex) in getExerciseQuestions(exercise.exercise_id)"
                  :key="questionIndex"
                >
                  <k-button
                    @click="goToQuestion(question.itemId, exercise.exercise_id)"
                    :primary="isSelected(question.itemId, exercise.exercise_id)"
                    appearance="flat-button"
                    :text="$tr(
                      'question',
                      { num: getQuestionIndex(question.itemId, exercise.exercise_id) + 1 }
                    )"
                  />
                  <coach-content-label
                    class="coach-content-label"
                    :value="numCoachContents(exercise)"
                    :isTopic="false"
                  />
                </li>
              </ol>
            </div>
          </k-grid-item>
          <k-grid-item size="2" cols="3" class="exercise-container">
            <content-renderer
              v-if="content && itemId"
              ref="contentRenderer"
              :id="content.pk"
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
          </k-grid-item>
        </k-grid>
      </div>
    </transition>
    <div class="close-btn-wrapper">
      <k-button
        :text="$tr('close')"
        :primary="true"
        @click="close"
      />
    </div>
  </core-modal>

</template>


<script>

  import find from 'lodash/find';
  import { ContentNodeResource } from 'kolibri.resources';
  import { createQuestionList, selectQuestionFromExercise } from 'kolibri.utils.exams';
  import coachContentLabel from 'kolibri.coreVue.components.coachContentLabel';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kGrid from 'kolibri.coreVue.components.kGrid';
  import kGridItem from 'kolibri.coreVue.components.kGridItem';
  import kCircularLoader from 'kolibri.coreVue.components.kCircularLoader';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import debounce from 'lodash/debounce';
  import { setExamsModal } from '../../../state/actions/exam';

  export default {
    name: 'previewExamModal',
    $trs: {
      preview: 'Preview exam',
      close: 'Close',
      question: 'Question { num }',
      numQuestions: '{num} {num, plural, one {question} other {questions}}',
      exercise: 'Exercise { num }',
    },
    components: {
      coachContentLabel,
      coreModal,
      contentRenderer,
      kButton,
      kGrid,
      kGridItem,
      kCircularLoader,
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
      examCreation: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      currentQuestionIndex: 0,
      exercises: {},
      loading: true,
      maxHeight: null,
    }),
    computed: {
      debouncedSetMaxHeight() {
        return debounce(this.setMaxHeight, 250);
      },
      availableExamQuestionSources() {
        return this.examQuestionSources.filter(questionSource => {
          return this.exercises[questionSource.exercise_id];
        });
      },
      questions() {
        return Object.keys(this.exercises).length
          ? createQuestionList(this.availableExamQuestionSources).map(question => ({
              itemId: selectQuestionFromExercise(
                question.assessmentItemIndex,
                this.examSeed,
                this.exercises[question.contentId]
              ),
              contentId: question.contentId,
            }))
          : [];
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
      examQuestionSources: 'setExercises',
    },
    updated() {
      this.debouncedSetMaxHeight();
    },
    created() {
      this.setExercises();
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
            this.windowSize.height - titleHeight - headerHeight - closeBtnHeight - margins;
        }
      },
      numCoachContents(exercise) {
        return find(this.exerciseContentNodes, { id: exercise.exercise_id }).num_coach_contents;
      },
      setExercises() {
        this.loading = true;
        ContentNodeResource.getCollection({
          ids: this.examQuestionSources.map(item => item.exercise_id),
        })
          .fetch()
          .then(contentNodes => {
            contentNodes.forEach(node => {
              this.$set(this.exercises, node.pk, node);
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
        this.setExamsModal(false);
      },
      getExerciseQuestions(exerciseId) {
        return this.questions.filter(q => q.contentId === exerciseId);
      },
    },
    vuex: {
      actions: {
        setExamsModal,
      },
      getters: {
        exerciseContentNodes: state => state.pageState.exerciseContentNodes,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .question-list-item
    vertical-align: middle

  .coach-content-label
    display: inline-block
    vertical-align: inherit

  .exam-preview-container
    margin-top: 16px

  .close-btn-wrapper
    text-align: right
    button
      margin-right: 0
      margin-bottom: 0

  >>>.modal
    max-width: unset
    max-height: unset

  .question-selector, .exercise-container
    overflow-y: auto

  ol
    padding: 0
    margin: 0

  li
    list-style-type: none

  h3
    margin-top: 1em
    margin-bottom: 0.25em

  .no-exercise-x
    text-align: center
    svg
      height: 200px
      width: 200px

</style>
