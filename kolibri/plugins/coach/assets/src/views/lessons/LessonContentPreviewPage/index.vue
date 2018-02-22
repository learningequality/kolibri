<template>

  <div class="content-preview-page">
    <metadata-area
      class="top-row"
      :content="content"
      :completionData="completionData"
    >
      <template v-if="workingResources">
        <template v-if="isSelected">
          <!-- include check icon here -->
          <mat-svg
            class="selected-icon"
            category="action"
            name="check_circle"
          />
          {{ $tr('addedToLessonIndicator') }}
          <k-button
            @click="removeFromWorkingResources"
            :text="$tr('undoButtonLabel')"
            appearance="basic-link"
          />
          <!-- TODO include undo button here -->
        </template>
        <k-button
          v-else
          @click="addToWorkingResources"
          :text="$tr('addToLessonButtonLabel')"
        />

      </template>
    </metadata-area>

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
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'lessonContentPreviewPage',
    components: {
      QuestionList,
      ContentArea,
      MetadataArea,
      kButton,
    },
    $trs: {
      questionLabel: 'Question { questionNumber, number }',
      undoButtonLabel: 'Undo',
      addToLessonButtonLabel: 'Add to lesson',
      addedToLessonIndicator: 'Added to lesson',
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
      isSelected() {
        return this.workingResources.includes(this.content.pk);
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
        completionData: state => state.pageState.completionData,
        workingResources: state => state.pageState.workingResources,
      },
      actions: {
        // Maybe break these out to actual actions.
        // Used by select page, summary page, and here
        addToWorkingResources(store) {
          store.dispatch('ADD_TO_WORKING_RESOURCES', this.content.pk);
        },
        removeFromWorkingResources(store) {
          store.dispatch('REMOVE_FROM_WORKING_RESOURCES', this.content.pk);
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

  .selected-icon
    height: 20px
    width: 20px
    vertical-align: bottom

  .top-row
    width: 100%
    height: $horizontal-split

  // went with this approach because of noscroll page. Not great on mobile
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
