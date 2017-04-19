<template>

  <core-modal :title="$tr('preview')" @cancel="close" maxWidth="100%">
    <ui-progress-linear v-show="loading"/>
    <div class="exam-preview-container" v-show="!loading">
      <div>
        <strong>{{ $tr('numQuestions', { num: examNumQuestions })}}</strong>
        <slot name="randomize-button"/>
      </div>
      <div class="pure-g">
        <div class="question-selector pure-u-1-3">
          <div v-for="(exercise, exerciseIndex) in examQuestionSources">
            <h2 v-if="examCreation">
              {{$tr('exercise', { num: exerciseIndex + 1 })}}
              <ui-icon-button
              icon="remove_circle_outline"
              size="small"
              type="secondary"
              :ariaLabel="$tr('removeExercise')"
              @click="removeExercise(exercise)"/>
              </h2>
            <ol class="question-list">
              <li v-for="(question, questionIndex) in questions.filter(q => q.contentId === exercise.exercise_id)">
                <ui-button
                  @click="goToQuestion(question.itemId)"
                  :type="isSelected(question.itemId) ? 'primary' : 'secondary'">
                    <span v-if="examCreation">{{ $tr('question', { num: questionIndex + 1 }) }}</span>
                    <span v-else>{{ $tr('question', { num: getQuestionIndex(question.itemId) + 1 }) }}</span>
                </ui-button>
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
            :allowHints="false"/>
          </div>
      </div>
      </div>
  </core-modal>

</template>


<script>

  const examActions = require('../../state/actions/exam');
  const ContentNodeResource = require('kolibri').resources.ContentNodeResource;
  const { createQuestionList, selectQuestionFromExercise } = require('kolibri.utils.exams');

  module.exports = {
    $trNameSpace: 'previewExamModal',
    $trs: {
      preview: 'Preview exam',
      close: 'Close',
      question: 'Question { num }',
      numQuestions: '{ num } questions',
      exercise: 'Exercise { num }',
      removeExercise: 'Remove exercise',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
      'ui-button': require('keen-ui/src/UiButton'),
      'ui-progress-linear': require('keen-ui/src/UiProgressLinear'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
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
      }
    },
    data: () => ({
      currentQuestionIndex: 0,
      exercises: {},
      loading: true,
    }),
    computed: {
      questions() {
        return Object.keys(this.exercises).length ? createQuestionList(
          this.examQuestionSources).map(
            question => ({
              itemId: selectQuestionFromExercise(
              question.assessmentItemIndex,
              this.examSeed,
              this.exercises[question.contentId]),
              contentId: question.contentId
            })
        ) : [];
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
    methods: {
      isSelected(questionItemId) {
        if (this.currentQuestion.itemId === questionItemId) {
          return true;
        }
        return false;
      },
      getQuestionIndex(questionItemId) {
        return this.questions.findIndex(question => question.itemId === questionItemId);
      },
      goToQuestion(questionItemId) {
        this.currentQuestionIndex = this.getQuestionIndex(questionItemId);
      },
      removeExercise(exercise) {
        this.$emit('removeExercise', { id: exercise.exercise_id, title: '' });
      },
      close() {
        this.displayExamModal(false);
      },
    },
    created() {
      ContentNodeResource.getCollection(
        { channel_id: this.examChannelId },
        { ids: this.examQuestionSources.map(item => item.exercise_id) }
        ).fetch().then(contentNodes => {
          contentNodes.forEach(node => { this.$set(this.exercises, node.pk, node); });
          this.loading = false;
        });
    },
    vuex: {
      actions: {
        displayExamModal: examActions.displayExamModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .question-selector
    max-height: 300px
    overflow-y: scroll
    border: 2px black

  ol
    padding: 0
    margin: 0

  li
    list-style-type: none

</style>
