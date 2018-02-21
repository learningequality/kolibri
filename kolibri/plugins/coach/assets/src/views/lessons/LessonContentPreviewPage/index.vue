<template>

  <div class="content-preview-page">
    <div class="description-area">
      Lesson Content Preview Page
    </div>
    <!-- TODO consolidate this and attemptloglist? -->
    <question-list
      class="question-list left column"
      @select="selectedQuestionIndex = $event"
      :questions="questions"
      :selectedIndex="selectedQuestionIndex"
    />
    <content-renderer
      class="content-area right column"
      :id="exercise.pk"
      :itemId="selectedQuestion"
      :allowHints="false"
      :kind="exercise.kind"
      :files="exercise.files"
      :contentId="exercise.content_id"
      :channelId="exercise.channel_id"
      :available="exercise.available"
      :extraFields="exercise.extra_fields"
      :interactive="false"
      :assessment="true"
    />
  </div>

</template>


<script>

  import contentRenderer from 'kolibri.coreVue.components.contentRenderer';
  import questionList from '../../question-list';
  export default {
    components: {
      contentRenderer,
      questionList,
    },
    data() {
      return {
        selectedQuestionIndex: 0,
      };
    },
    computed: {
      selectedQuestion() {
        return this.questions[this.selectedQuestionIndex];
      },
    },
    methods: {},
    vuex: {
      getters: {
        exercise: state => state.pageState.currentContentNode,
        questions: state => state.pageState.questions,
      },
      actions: {},
    },
    $trs: {},
  };

</script>


<style lang="stylus" scoped>

  $vertical-split = 30%
  $horizontal-split = 30%

  .content-preview-page
    height: 100% // establish containing-blocks' height
    position: relative // set the context for absolute elements within

  .description-area
    width: 100%
    height: $horizontal-split

  .column
    position: absolute
    bottom: 0
    top: $horizontal-split
    &.left
      left: 0
      right: 100% - $vertical-split
    &.right
      margin-left: 8px
      right: 0
      left: $vertical-split

</style>
