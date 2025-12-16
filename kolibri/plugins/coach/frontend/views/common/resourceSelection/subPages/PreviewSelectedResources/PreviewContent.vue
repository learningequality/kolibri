<template>

  <div>
    <ContentArea
      :header="questionLabel(selectedQuestionIndex)"
      :selectedQuestion="selectedQuestion"
      :content="currentContentNode"
      :isExercise="isExercise"
    />

    <SlotTruncator
      v-if="description"
      :maxHeight="75"
      :showViewMore="true"
    >
      <!-- eslint-disable vue/no-v-html -->
      <p
        dir="auto"
        v-html="description"
      ></p>
      <!-- eslint-enable -->
    </SlotTruncator>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import markdownIt from 'markdown-it';
  import SlotTruncator from 'kolibri-common/components/SlotTruncator';
  import ContentArea from '../../../../lessons/LessonSelectionContentPreviewPage/LessonContentPreview/ContentArea.vue';

  export default {
    name: 'PreviewContent',
    components: {
      ContentArea,
      SlotTruncator,
    },
    mixins: [commonCoreStrings],
    props: {
      currentContentNode: {
        type: Object,
        required: true,
      },
      questions: {
        type: Array,
        required: false,
        default: () => [],
      },
      isExercise: {
        type: Boolean,
        required: true,
      },
    },
    data() {
      return {
        selectedQuestionIndex: 0,
      };
    },
    computed: {
      selectedQuestion() {
        if (this.isExercise) {
          return this.questions[this.selectedQuestionIndex];
        }
        return '';
      },
      description() {
        if (this.currentContentNode && this.currentContentNode.description) {
          const md = new markdownIt('zero', { breaks: true });
          return md.render(this.currentContentNode.description);
        }

        return undefined;
      },
    },
    methods: {
      questionLabel(questionIndex) {
        if (!this.isExercise) {
          return '';
        }
        const questionNumber = questionIndex + 1;
        return this.coreString('questionNumberLabel', { questionNumber });
      },
    },
  };

</script>


<style lang="scss" scoped>

  /deep/ .content-viewer {
    position: relative;
    max-height: 500px;
  }

</style>
