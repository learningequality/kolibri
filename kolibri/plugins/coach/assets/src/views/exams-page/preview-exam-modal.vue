<template>

  <core-modal :title="`${examTitle} ${$tr('preview')}`" @cancel="close">
    <div>Exam Preview</div>
    <div class="question-selector-container">
      <div class="question-selector">
        <ul class="question-list">
          <template v-for="(question, index) in questions">
            <li @click="goToQuestion(index)" :class="isSelected(index)" class="clickable">
              <h3>
                {{ $tr('question', { num: index + 1 }) }}
              </h3>
            </li>
          </template>
        </ul>
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
          :channelId="exam.channel_id"
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
      preview: 'Preview',
      close: 'Close',
      question: 'Question { num }',
    },
    components: {
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'content-renderer': require('kolibri.coreVue.components.contentRenderer'),
    },
    props: {
      exam: {
        type: Object,
        required: true,
      },
    },
    methods: {
      close() {
        this.displayModal(false);
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
          return JSON.parse(this.exam.question_sources);
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
        { channel_id: this.exam.channel_id },
        { ids: this.questionSources.map(item => item.exercise_id) }
        ).fetch().then(contentNodes => {
          contentNodes.forEach(node => { this.$set(this.contentNodeMap, node.pk, node); });
        });
    },
    data: () => ({
      questionNumber: 0,
      contentNodeMap: {},
    }),
    vuex: {
      actions: {
        displayModal: examActions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .question-selector
    background-color: $core-bg-light

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

</style>
