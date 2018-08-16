<template>

  <MultiPaneLayout>
    <div
      slot="header"
      class="header"
    >
      <MetadataArea
        class="ib"
        :class="{left: workingResources}"
        :content="currentContentNode"
        :completionData="completionData"
      />
      <SelectOptions
        v-if="workingResources"
        class="select-options ib"
        :workingResources="workingResources"
        :contentId="currentContentNode.id"
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
      :content="currentContentNode"
      :isPerseusExercise="isPerseusExercise"
    />
  </MultiPaneLayout>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
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
        title: this.currentContentNode.title,
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
      ...mapGetters(['getChannelForNode']),
      ...mapState('lessonSummary', ['workingResources', 'currentContentNode']),
      ...mapState('lessonSummary/resources', {
        questions: state => state.preview.questions,
        completionData: state => state.preview.completionData,
      }),
      isPerseusExercise() {
        return this.currentContentNode.kind === 'exercise';
      },
      selectedQuestion() {
        if (this.isPerseusExercise) {
          return this.questions[this.selectedQuestionIndex];
        }
        return '';
      },
    },
    methods: {
      ...mapActions('lessonSummary', ['addToResourceCache']),
      addToCache() {
        this.addToResourceCache({ node: this.currentContentNode });
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
