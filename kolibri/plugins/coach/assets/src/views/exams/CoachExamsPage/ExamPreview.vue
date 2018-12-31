<template>

  <KModal
    ref="modal"
    :title="$tr('preview')"
    :submitText="$tr('close')"
    size="large"
    :width="`${windowWidth - 16}px`"
    :height="`${windowHeight - 16}px`"
    @submit="close"
    @cancel="close"
  >
    <transition mode="out-in">
      <div v-if="exerciseContentNodes.length === 0" class="no-exercise">
        {{ $tr('missingContent') }}
      </div>
      <div v-else @keyup.enter.stop>
        <div ref="header">
          <strong>{{ $tr('numQuestions', { num: examQuestions.length }) }}</strong>
          <slot name="randomize-button"></slot>
        </div>
        <KGrid class="exam-preview-container">
          <KGridItem
            sizes="1, 3, 4"
            :style="{ maxHeight: `${maxHeight}px` }"
            class="o-y-auto"
          >
            <ol class="question-list">
              <li
                v-for="(question, questionIndex) in examQuestions"
                :key="question.question_id"
                class="question-list-item"
              >
                <KButton
                  :primary="isSelected(question)"
                  appearance="flat-button"
                  :text="$tr('question', { num: questionIndex + 1 })"
                  @click="currentQuestionIndex = questionIndex"
                />
                <CoachContentLabel
                  class="coach-content-label"
                  :value="numCoachContents(question.exercise_id)"
                  :isTopic="false"
                />
              </li>
            </ol>
          </KGridItem>
          <KGridItem
            sizes="3, 5, 8"
            :style="{ maxHeight: `${maxHeight}px` }"
            class="o-y-auto"
          >
            <ContentRenderer
              v-if="content && itemId"
              :id="content.id"
              ref="contentRenderer"
              :kind="content.kind"
              :files="content.files"
              :contentId="content.content_id"
              :available="content.available"
              :extraFields="content.extra_fields"
              :itemId="itemId"
              :assessment="true"
              :allowHints="false"
              :showCorrectAnswer="true"
              :interactive="false"
            />
          </KGridItem>
        </KGrid>
      </div>
    </transition>
  </KModal>

</template>


<script>

  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import KModal from 'kolibri.coreVue.components.KModal';
  import ContentRenderer from 'kolibri.coreVue.components.ContentRenderer';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import debounce from 'lodash/debounce';

  export default {
    name: 'ExamPreview',
    $trs: {
      preview: 'Preview quiz',
      close: 'Close',
      question: 'Question { num }',
      numQuestions: '{num} {num, plural, one {question} other {questions}}',
      exercise: 'Exercise { num }',
      missingContent: 'This quiz cannot be displayed because some content was deleted',
    },
    components: {
      CoachContentLabel,
      KModal,
      ContentRenderer,
      KButton,
      KGrid,
      KGridItem,
    },
    mixins: [responsiveWindow],
    props: {
      examQuestions: {
        type: Array,
        required: true,
      },
      exerciseContentNodes: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        currentQuestionIndex: 0,
        maxHeight: null,
      };
    },
    computed: {
      exercises() {
        const exercises = {};
        this.exerciseContentNodes.forEach(exercise => {
          exercises[exercise.id] = exercise;
        });
        return exercises;
      },
      debouncedSetMaxHeight() {
        return debounce(this.setMaxHeight, 250);
      },
      currentQuestion() {
        return this.examQuestions[this.currentQuestionIndex] || {};
      },
      content() {
        return this.exercises[this.currentQuestion.exercise_id];
      },
      itemId() {
        return this.currentQuestion.question_id;
      },
    },
    updated() {
      this.debouncedSetMaxHeight();
    },
    methods: {
      setMaxHeight() {
        const title = this.$refs.modal.$el.querySelector('#modal-title');
        const header = this.$refs.header;
        if (title && header) {
          const titleHeight = title.clientHeight;
          const headerHeight = header.clientHeight;
          const closeBtnHeight = 44;
          const margins = 16 * 6;
          this.maxHeight =
            this.windowHeight - titleHeight - headerHeight - closeBtnHeight - margins;
        }
      },
      numCoachContents(exerciseId) {
        return this.exercises[exerciseId].num_coach_contents;
      },
      isSelected(question) {
        return (
          this.currentQuestion.question_id === question.question_id &&
          this.currentQuestion.exercise_id === question.exercise_id
        );
      },
      close() {
        this.$emit('close');
      },
    },
  };

</script>


<style lang="scss" scoped>

  .question-list-item {
    vertical-align: middle;
  }

  .coach-content-label {
    display: inline-block;
    vertical-align: inherit;
  }

  .exam-preview-container {
    margin-top: 16px;
  }

  /deep/ .modal {
    max-width: unset;
    max-height: unset;
  }

  ol {
    padding: 0;
    margin: 0;
  }

  li {
    list-style-type: none;
  }

  h3 {
    margin-top: 1em;
    margin-bottom: 0.25em;
  }

  .no-exercise {
    text-align: center;
  }

  .o-y-auto {
    overflow-y: auto;
  }

</style>
