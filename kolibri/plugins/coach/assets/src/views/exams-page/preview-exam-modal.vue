<template>

  <core-modal :title="$tr('preview')" @cancel="close" width="100%" height="100%">
    <ui-progress-linear v-show="loading" />
    <div v-show="!loading">
      <div>
        <strong>{{ $tr('numQuestions', { num: examNumQuestions }) }}</strong>
        <slot name="randomize-button"></slot>
      </div>
      <div class="exam-preview-container pure-g">
        <div class="question-selector pure-u-1-3">
          <div v-for="(exercise, exerciseIndex) in examQuestionSources" :key="exerciseIndex">
            <h3 v-if="examCreation">{{ getExerciseName(exercise.exercise_id) }}</h3>
            <ol class="question-list">
              <li
                v-for="(question, questionIndex) in questions.filter(q => q.contentId === exercise.exercise_id)"
                :key="questionIndex"
              >
                <k-button
                  @click="goToQuestion(question.itemId, exercise.exercise_id)"
                  :primary="isSelected(question.itemId, exercise.exercise_id)"
                  appearance="flat-button"
                  :text="$tr('question', { num: getQuestionIndex(question.itemId, exercise.exercise_id) + 1 })"
                />
              </li>
            </ol>
          </div>
        </div>
        <div class="exercise-container pure-u-2-3">
          <content-renderer
            v-if="content && itemId"
            class="content-renderer"
            ref="contentRenderer"
            :id="content.pk"
            :kind="content.kind"
            :files="content.files"
            :contentId="content.content_id"
            :channelId="examChannelId"
            :available="content.available"
            :extraFields="content.extra_fields"
            :itemId="itemId"
            :assessment="true"
            :allowHints="false" />
          </div>
      </div>
      </div>
  </core-modal>

</template>


<script>

  import * as examActions from '../../state/actions/exam';
  import { ContentNodeResource } from 'kolibri.resources';
  import { createQuestionList, selectQuestionFromExercise } from 'kolibri.utils.exams';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiProgressLinear from 'keen-ui/src/UiProgressLinear';
  export default {
    name: 'previewExamModal',
    $trs: {
      preview: 'Preview exam',
      close: 'Close',
      question: 'Question { num }',
      numQuestions: '{ num } questions',
      exercise: 'Exercise { num }',
    },
    components: {
      coreModal,
      contentRenderer,
      kButton,
      uiProgressLinear,
    },
    props: {
      examChannelId: {
        type: String,
        required: true,
      },
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
    }),
    computed: {
      questions() {
        return Object.keys(this.exercises).length
          ? createQuestionList(this.examQuestionSources).map(question => ({
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
    created() {
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
    methods: {
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
        this.displayExamModal(false);
      },
    },
    vuex: { actions: { displayExamModal: examActions.displayExamModal } },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .exam-preview-container
    padding-top: 1em
    max-height: calc(100vh - 160px)

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

</style>
