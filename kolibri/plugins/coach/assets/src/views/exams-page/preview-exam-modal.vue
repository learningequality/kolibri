<template>

  <core-modal :title="$tr('preview')" @cancel="close" maxWidth="100%">
    <div class="question-selector-container">
      <div class="question-selector">
        <div>
          {{ $tr('numQuestions', { num: exam.questionCount })}}
        </div>
        <ui-collapsible v-for="(source, exIndex) in questionSources" :title="$tr('exercise', { num: exIndex + 1 })" :open="exIndex===0">
          <ul class="question-list">
            <template v-for="(question, index) in questions.filter(q => q.contentId === source.exercise_id)">
              <li @click="goToQuestion(index)" :class="isSelected(index)" class="clickable">
                <h3>
                  {{ $tr('question', { num: index + 1 }) }}
                </h3>
              </li>
            </template>
          </ul>
        </ui-collapsible>
      </div>
      <div class="exercise-container">
        <content-renderer
          v-if="content && itemId"
          class="content-renderer"
          ref="contentRenderer"
          :id="content.pk"
          :kind="content.kind"
          :files="content.files"
          :contentId="content.content_id"
          :channelId="exam.channelId"
          :available="content.available"
          :extraFields="content.extra_fields"
          :itemId="itemId"
          :assessment="true"
          :allowHints="false"/>
        </div>
      </div>
    <icon-button :text="$tr('close')" @click="close"/>
  </core-modal>

</template>


<script>

  const examActions = require('../../state/actions/exam');
  const ContentNodeResource = require('kolibri').resources.ContentNodeResource;
  const { createQuestionList, selectQuestionFromExercise } = require('kolibri.utils.exams');

  module.exports = {
    $trNameSpace: 'previewExamModal',
    $trs: {
      preview: 'Preview Exam Exercises',
      close: 'Close',
      question: 'Question { num }',
      numQuestions: '{ num } questions',
      exercise: 'Exercise { num }',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
      'ui-collapsible': require('keen-ui/src/UiCollapsible'),
    },
    props: {
      exam: {
        type: Object,
        required: true,
      },
    },
    methods: {
      close() {
        this.displayExamModal(false);
      },
      isSelected(index) {
        if (this.questionNumber === index) {
          return 'selected';
        }
        return null;
      },
      goToQuestion(index) {
        this.questionNumber = index;
      },
    },
    computed: {
      seed() {
        return this.exam.seed;
      },
      questionSources() {
        try {
          return JSON.parse(this.exam.questionSources);
        } catch (e) {
          if (e instanceof SyntaxError) {
            return [];
          }
          throw e;
        }
      },
      questions() {
        return Object.keys(this.contentNodeMap).length ? createQuestionList(
          this.questionSources).map(
            question => ({
              itemId: selectQuestionFromExercise(
              question.assessmentItemIndex,
              this.seed,
              this.contentNodeMap[question.contentId]),
              contentId: question.contentId
            })
        ) : [];
      },
      currentQuestion() {
        return this.questions[this.questionNumber] || {};
      },
      content() {
        return this.contentNodeMap[this.currentQuestion.contentId];
      },
      itemId() {
        return this.currentQuestion.itemId;
      },
    },
    created() {
      ContentNodeResource.getCollection(
        { channel_id: this.exam.channelId },
        { ids: this.questionSources.map(item => item.exercise_id) }
        ).fetch().then(contentNodes => {
          contentNodes.forEach(node => { this.$set(this.contentNodeMap, node.pk, node); });
        });
    },
    mounted() {
      // Filthy hack to force Keen UI Collapsible to resize
      const event = document.createEvent('Event');
      event.initEvent('resize', true, true);
      window.dispatchEvent(event);
    },
    data: () => ({
      questionNumber: 0,
      contentNodeMap: {},
    }),
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
    background-color: $core-bg-light
    width: 30%
    height: 100%
    overflow-y: auto
    float: left

  .question-list
    list-style-type: none
    max-height: inherit
    margin: 0
    padding-left: 0

  li
    clear: both
    border: none
    padding-left: 20px
    height: 64px

  .clickable
    cursor: pointer

  .selected
    background-color: $core-text-disabled

  .exercise-container
    width: 70%
    float: left

</style>
