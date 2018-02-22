<template>

  <div class="content-preview-page">
    <metadata-area
      :content="content"
    />
    <!-- TODO consolidate this and attemptloglist? -->
    <question-list
      class="question-list left column"
      @select="selectedQuestionIndex = $event"
      :questions="questions"
      :questionLabel="questionLabel"
      :selectedIndex="selectedQuestionIndex"
    />

    <content-area
      class="content-area right column"
      :header="questionLabel(selectedQuestionIndex)"
      :selectedQuestion="selectedQuestion"
      :content="content"
      :isPerseusExercise="isPerseusExercise"
    />
  </div>

</template>


<script>

  import QuestionList from './QuestionList';
  import ContentArea from './ContentArea';
  import MetadataArea from './MetadataArea';

  export default {
    name: 'LessonContentPreviewPage',
    components: {
      QuestionList,
      ContentArea,
      MetadataArea,
    },
    $trs: {
      questionLabel: 'Question { questionNumber, number }',
    },
    data() {
      return {
        selectedQuestionIndex: 0,
      };
    },
    computed: {
      isPerseusExercise() {
        return this.content.kind === 'exercise';
      },
      selectedQuestion() {
        if (this.isPerseusExercise) {
          return this.questions[this.selectedQuestionIndex];
        }
        return '';
      },
    },
    methods: {
      questionLabel(questionIndex) {
        const questionNumber = questionIndex + 1;
        return this.$tr('questionLabel', { questionNumber });
      },
    },
    vuex: {
      getters: {
        content: state => state.pageState.currentContentNode,
        questions: state => state.pageState.questions,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  $vertical-split = 30%
  $horizontal-split = 20%

  .content-preview-page
    height: 100% // establish containing-blocks' height
    position: relative // set the context for absolute elements within

  .description-area
    width: 100%
    height: $horizontal-split

  // went with this approach because of noscroll page
  // might want to explore doing this with pure (original plan)
  .column
    position: absolute
    bottom: 0
    top: $horizontal-split
    background-color: white

    &.left
      left: 0
      right: 100% - $vertical-split
    &.right
      margin-left: 8px
      right: 0
      left: $vertical-split

</style>
