<template>

  <AccordionContainer>
    <template #header="{ canExpandAll, expandAll, canCollapseAll, collapseAll }">
      <div class="questions-accordion-header">
        <div>
          <KCheckbox
            v-if="isSelectable"
            ref="selectAllCheckbox"
            :class="['select-all-box', { 'select-all-box-sortable': isSortable }]"
            :label="selectAllLabel$()"
            :disabled="selectAllIsDisabled"
            :checked="selectAllIsChecked"
            :indeterminate="selectAllIsIndeterminate"
            @change="handleSelectAll"
            @click.stop="() => {}"
          />
        </div>
        <div class="trailing-actions">
          <KIconButton
            icon="expandAll"
            :tooltip="expandAll$()"
            :disabled="!canExpandAll"
            @click="expandAll"
          />
          <KIconButton
            icon="collapseAll"
            :tooltip="collapseAll$()"
            :disabled="!canCollapseAll"
            @click="collapseAll"
          />
          <slot name="header-trailing-actions"></slot>
        </div>
      </div>
    </template>

    <DraggableRegion
      key="drag-container"
      :items="questions"
      @update:items="handleQuestionOrderChange"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
    >
      <DraggableItem
        v-for="(question, index) in questions"
        :key="`drag-${question.item}`"
        tabindex="-1"
        :style="{
          background: $themeTokens.surface,
        }"
      >
        <AccordionItem
          :title="getDisplayQuestionTitle(question, getQuestionContent(question)?.title)"
          :disabledTitle="questionItemsToReplace?.includes(question.item)"
          :aria-selected="questionIsChecked(question)"
          :headerAppearanceOverrides="{
            userSelect: dragActive ? 'none !important' : 'text',
          }"
        >
          <template #leading-actions>
            <DraggableHandle v-if="isSortable">
              <div>
                <DragSortWidget
                  :isFirst="index === 0"
                  :isLast="index === questions.length - 1"
                  :itemLabel="
                    getDisplayQuestionTitle(question, getQuestionContent(question)?.title)
                  "
                  :position="index + 1"
                  :total="questions.length"
                  @moveUp="() => handleKeyboardDragUp(index)"
                  @moveDown="() => handleKeyboardDragDown(index)"
                />
              </div>
            </DraggableHandle>
            <KCheckbox
              v-if="isSelectable"
              class="accordion-item-checkbox"
              :checked="questionIsChecked(question)"
              :disabled="questionCheckboxDisabled(question)"
              @change="
                (value, $event) => handleQuestionCheckboxChange(question.item, value, $event)
              "
            />
          </template>
          <template #trailing-actions>
            <span v-if="questionItemsToReplace?.includes(question.item)">
              {{ replacingThisQuestionLabel$() }}
            </span>
            <slot
              name="question-trailing-actions"
              :question="question"
            ></slot>
          </template>
          <template #content>
            <div
              :id="`question-panel-${question.item}`"
              :style="{ userSelect: dragActive ? 'none !important' : 'text' }"
            >
              <ContentViewer
                v-if="questionContentExists(question)"
                :ref="`contentRenderer-${question.item}`"
                :contentNode="getQuestionContent(question)"
                :itemId="question.question_id"
                :allowHints="false"
                :interactive="false"
                :showCorrectAnswer="true"
                @interaction="() => null"
                @updateProgress="() => null"
                @updateContentState="() => null"
                @error="err => $emit('error', err)"
              />
              <div v-else>
                <KIcon
                  icon="warning"
                  :style="{ fill: $themePalette.yellow.v_600 }"
                />
                {{ coreString('resourceNotFoundOnDevice') }}
              </div>
              <slot
                name="questionExtraContent"
                :question="question"
              ></slot>
            </div>
          </template>
        </AccordionItem>
      </DraggableItem>
    </DraggableRegion>
  </AccordionContainer>

</template>


<script>

  import { computed, ref } from 'vue';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import DraggableItem from 'kolibri-common/components/draggable/DraggableItem';
  import DraggableHandle from 'kolibri-common/components/draggable/DraggableHandle';
  import DraggableRegion from 'kolibri-common/components/draggable/DraggableRegion';
  import DragSortWidget from 'kolibri-common/components/draggable/DragSortWidget';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import useDrag from './useDrag.js';

  export default {
    name: 'QuestionsAccordion',
    components: {
      DraggableItem,
      DraggableHandle,
      DraggableRegion,
      DragSortWidget,
      AccordionItem,
      AccordionContainer,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const dragActive = ref(false);

      const { selectAllLabel$, expandAll$, collapseAll$, replacingThisQuestionLabel$ } =
        enhancedQuizManagementStrings;

      const { moveUpOne, moveDownOne } = useDrag();

      function questionCheckboxDisabled(question) {
        if (
          props.disabled ||
          props.unselectableQuestionItems?.includes(question.item) ||
          props.questionItemsToReplace?.includes(question.item)
        ) {
          return true;
        }
        if (
          props.selectedQuestions.includes(question.item) ||
          props.maxSelectableQuestions === null
        ) {
          return false;
        }
        return props.selectedQuestions.length >= props.maxSelectableQuestions;
      }

      function questionIsChecked(question) {
        if (props.questionItemsToReplace?.includes(question.item)) {
          return false;
        }
        if (props.unselectableQuestionItems?.includes(question.item)) {
          return true;
        }
        return props.selectedQuestions.includes(question.item);
      }

      const selectableQuestions = computed(() => {
        if (!props.isSelectable) {
          return [];
        }
        return props.questions.filter(
          question => !props.unselectableQuestionItems?.includes(question.item),
        );
      });

      const selectAllIsChecked = computed(
        () =>
          selectableQuestions.value.length > 0 &&
          selectableQuestions.value.every(question =>
            props.selectedQuestions.includes(question.item),
          ),
      );

      const selectAllIsIndeterminate = computed(
        () =>
          selectableQuestions.value.length > 0 &&
          !selectAllIsChecked.value &&
          selectableQuestions.value.some(question =>
            props.selectedQuestions.includes(question.item),
          ),
      );

      const selectAllIsDisabled = computed(() => {
        if (props.disabled) {
          return true;
        }
        if (props.maxSelectableQuestions === null || selectAllIsChecked.value) {
          return false;
        }
        if (props.selectedQuestions.length >= props.maxSelectableQuestions) {
          return true;
        }
        const deselectedQuestions = selectableQuestions.value.filter(
          question => !props.selectedQuestions.includes(question.item),
        );
        const selectedQuestionsLength = props.selectedQuestions.length;
        const potentialSelectionLength = selectedQuestionsLength + deselectedQuestions.length;
        return potentialSelectionLength > props.maxSelectableQuestions;
      });

      return {
        dragActive,
        selectableQuestions,
        selectAllIsDisabled,
        selectAllIsChecked,
        selectAllIsIndeterminate,

        moveUpOne,
        moveDownOne,
        questionIsChecked,
        questionCheckboxDisabled,

        selectAllLabel$,
        expandAll$,
        collapseAll$,
        replacingThisQuestionLabel$,
      };
    },
    props: {
      questions: {
        type: Array,
        required: true,
      },
      getQuestionContent: {
        type: Function,
        required: true,
      },
      selectedQuestions: {
        type: Array,
        required: false,
        default: () => [],
      },
      isSelectable: {
        type: Boolean,
        required: false,
        default: true,
      },
      /**
       * Maximum number of questions that can be selected.
       */
      maxSelectableQuestions: {
        type: Number,
        required: false,
        default: null,
      },
      /**
       * If true, all checkboxes will be disabled.
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * Array of question ids that already belongs to the quiz,
       * and should not be selectable.
       */
      unselectableQuestionItems: {
        type: Array,
        required: false,
        default: null,
      },
      /**
       * If provided, the question with this item will appear as disabled
       * and with a `Replacing this question` message.
       */
      questionItemsToReplace: {
        type: Array,
        required: false,
        default: null,
      },
    },
    computed: {
      isSortable() {
        return this.$listeners.sort !== undefined;
      },
    },
    methods: {
      handleDragStart() {
        // Used to mitigate the issue of text being selected while dragging
        this.dragActive = true;
      },
      handleDragEnd() {
        // Reset on drag end (not only on a reorder) so a drag that changes nothing
        // still re-enables text selection.
        this.dragActive = false;
      },
      handleQuestionOrderChange(newArray) {
        this.$emit('sort', { newArray });
      },
      handleKeyboardDragDown(oldIndex) {
        const newArray = this.moveDownOne(oldIndex, this.questions);
        this.handleQuestionOrderChange(newArray);
      },
      handleKeyboardDragUp(oldIndex) {
        const newArray = this.moveUpOne(oldIndex, this.questions);
        this.handleQuestionOrderChange(newArray);
      },
      handleQuestionCheckboxChange(questionItem, value, $event) {
        $event.stopPropagation();
        if (value) {
          this.$emit('selectQuestions', [questionItem]);
        } else {
          this.$emit('deselectQuestions', [questionItem]);
        }
      },
      handleSelectAll(value) {
        if (value) {
          this.$emit(
            'selectQuestions',
            this.selectableQuestions.map(question => question.item),
          );
        } else {
          this.$emit(
            'deselectQuestions',
            this.selectableQuestions.map(question => question.item),
          );
        }
      },
      getDisplayQuestionTitle(question, title) {
        return title || this.coreString('resourceNotFoundOnDevice');
      },
      questionContentExists(question) {
        const content = this.getQuestionContent(question);
        return content && content.available;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .questions-accordion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-left: 8px;

    .select-all-box {
      margin-top: 0;
      margin-bottom: 0;

      &.select-all-box-sortable {
        margin-left: 1.5em;
      }

      // Vertical centering here into the KCheckbox
      /deep/ & label {
        line-height: 28px;
      }
    }

    .trailing-actions {
      display: flex;
      align-items: center;
    }
  }

  .accordion-item-checkbox {
    margin-left: 0.5em;
  }

</style>
