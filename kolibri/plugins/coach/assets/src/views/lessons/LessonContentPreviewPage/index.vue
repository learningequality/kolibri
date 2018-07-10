<template>

  <multi-pane-layout>
    <div
      slot="header"
      class="header"
    >
      <metadata-area
        class="ib"
        :class="{left: workingResources}"
        :content="content"
        :completionData="completionData"
      />
      <select-options
        v-if="workingResources"
        class="select-options ib"
        :workingResources="workingResources"
        :contentId="content.pk"
        @addresource="addToCache"
      />
    </div>

    <question-list
      slot="aside"
      v-if="isPerseusExercise"
      @select="selectedQuestionIndex = $event"
      :questions="questions"
      :questionLabel="questionLabel"
      :selectedIndex="selectedQuestionIndex"
    />

    <content-area
      slot="main"
      :header="questionLabel(selectedQuestionIndex)"
      :selectedQuestion="selectedQuestion"
      :content="content"
      :isPerseusExercise="isPerseusExercise"
    />
  </multi-pane-layout>

</template>


<script>

  import { mapState, mapMutations } from 'vuex';
  import kButton from 'kolibri.coreVue.components.kButton';
  import multiPaneLayout from 'kolibri.coreVue.components.multiPaneLayout';
  import QuestionList from './QuestionList';
  import ContentArea from './ContentArea';
  import MetadataArea from './MetadataArea';
  import SelectOptions from './SelectOptions';

  export default {
    name: 'lessonContentPreviewPage',
    metaInfo() {
      return {
        title: this.content.title,
      };
    },
    components: {
      QuestionList,
      ContentArea,
      MetadataArea,
      SelectOptions,
      kButton,
      multiPaneLayout,
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
      ...mapState({
        content: state => state.pageState.currentContentNode,
        questions: state => state.pageState.questions,
        completionData: state => state.pageState.completionData,
        workingResources: state => state.pageState.workingResources,
      }),
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
      ...mapMutations({
        addToResourceCache: 'ADD_TO_RESOURCE_CACHE',
      }),
      addToCache() {
        this.addToResourceCache(this.content);
      },
      questionLabel(questionIndex) {
        if (!this.isPerseusExercise) {
          return '';
        }
        const questionNumber = questionIndex + 1;
        return this.$tr('questionLabel', { questionNumber });
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .header
    background-color: $core-bg-light
    padding: 16px

  .select-options
    width: 20%
    text-align: right
    vertical-align: top

  .ib
    display: inline-block

  .left
    width: 80%

</style>
