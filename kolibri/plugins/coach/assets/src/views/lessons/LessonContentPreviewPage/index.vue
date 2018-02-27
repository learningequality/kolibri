<template>

  <div class="content-preview-page">
    <metadata-area
      class="top"
      :class="{left: workingResources}"
      :content="content"
      :completionData="completionData"
    />
    <select-options
      v-if="workingResources"
      class="select-options"
      :workingResources="workingResources"
      :contentId="content.pk"
      @addresource="addToCache"
    />

    <question-list
      v-if="isPerseusExercise"
      class="question-list bottom left"
      @select="selectedQuestionIndex = $event"
      :questions="questions"
      :questionLabel="questionLabel"
      :selectedIndex="selectedQuestionIndex"
    />

    <content-area
      class="content-area bottom"
      :class="{right: isPerseusExercise}"
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
  import SelectOptions from './SelectOptions';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'lessonContentPreviewPage',
    components: {
      QuestionList,
      ContentArea,
      MetadataArea,
      SelectOptions,
      kButton,
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
        if (!this.isPerseusExercise) {
          return '';
        }
        const questionNumber = questionIndex + 1;
        return this.$tr('questionLabel', { questionNumber });
      },
    },
    vuex: {
      getters: {
        content: state => state.pageState.currentContentNode,
        questions: state => state.pageState.questions,
        completionData: state => state.pageState.completionData,
        workingResources: state => state.pageState.workingResources,
      },
      actions: {
        addToCache(store) {
          store.dispatch('ADD_TO_RESOURCE_CACHE', this.content);
        },
      },
    },
  };

</script>


<style lang="stylus" scoped>

  $vertical-split = 30%
  $horizontal-split = 25%

  .content-preview-page
    height: 100% // establish containing-blocks' height
    position: relative // set the context for absolute elements within

  .select-options
    max-width: 20%
    position: absolute
    // NOTE stylus specific - calc + variable interpolation
    bottom: 'calc(100% - %s)' % 28px // should line up with header
    margin-bottom: 0
    right: 0


  .top
    height: $horizontal-split
    &.left
      max-width: 80%

  // went with this approach because of noscroll page. Not great on mobile
  // might want to explore doing this with pure (original plan)
  .bottom
    position: absolute
    bottom: 0
    top: $horizontal-split
    background-color: white
    left: 0
    right: 0

    &.left
      right: 100% - $vertical-split
    &.right
      margin-left: 8px
      left: $vertical-split

</style>
