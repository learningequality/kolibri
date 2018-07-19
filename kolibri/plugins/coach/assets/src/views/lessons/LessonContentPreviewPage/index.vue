<template>

  <MultiPaneLayout>
    <div
      slot="header"
      class="header"
    >
      <MetadataArea
        class="ib"
        :class="{left: workingResources}"
        :content="content"
        :completionData="completionData"
      />
      <SelectOptions
        v-if="workingResources"
        class="select-options ib"
        :workingResources="workingResources"
        :contentId="content.pk"
        @addresource="addToCache"
      />
    </div>

    <QuestionList
      slot="aside"
      v-if="isPerseusExercise"
      @select="selectedQuestionIndex = $event"
      :questions="questions"
      :questionLabel="questionLabel"
      :selectedIndex="selectedQuestionIndex"
    />

    <ContentArea
      slot="main"
      :header="questionLabel(selectedQuestionIndex)"
      :selectedQuestion="selectedQuestion"
      :content="content"
      :isPerseusExercise="isPerseusExercise"
    />
  </MultiPaneLayout>

</template>


<script>

  import { mapState, mapMutations } from 'vuex';
  import KButton from 'kolibri.coreVue.components.KButton';
  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import QuestionList from './QuestionList';
  import ContentArea from './ContentArea';
  import MetadataArea from './MetadataArea';
  import SelectOptions from './SelectOptions';

  export default {
    name: 'LessonContentPreviewPage',
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
      KButton,
      MultiPaneLayout,
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


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .header {
    padding: 16px;
    background-color: $core-bg-light;
  }

  .select-options {
    width: 20%;
    text-align: right;
    vertical-align: top;
  }

  .ib {
    display: inline-block;
  }

  .left {
    width: 80%;
  }

</style>
