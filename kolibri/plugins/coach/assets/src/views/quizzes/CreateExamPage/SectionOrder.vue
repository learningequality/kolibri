<template>

  <div
    v-if="activeSection"
    class="section-settings-content"
  >
    <h1>
      {{ coreString('editAction') + ' - ' + sectionOrderLabel$() }}
    </h1>

    <DragContainer
      v-if="sectionOrderList.length > 0"
      :items="sectionOrderList"
      @sort="handleSectionSort"
    >
      <transition-group>
        <Draggable
          v-for="(section, index) in sectionOrderList"
          :key="section.section_id"
          :style="draggableStyle"
        >
          <DragHandle>
            <div
              :style="
                activeSection.section_id === section.section_id ? activeSectionStyles : borderStyle
              "
              class="section-order-list"
            >
              <DragSortWidget
                class="drag-title"
                :moveUpText="upLabel$"
                :moveDownText="downLabel$"
                :noDrag="true"
                :isFirst="index === 0"
                :isLast="index === sectionOrderList.length - 1"
                @moveUp="() => handleKeyboardDragUp(index, sectionOrderList)"
                @moveDown="() => handleKeyboardDragDown(index, sectionOrderList)"
              />
              <span
                class="drag-title"
                style="flex: 1"
              >
                {{ sectionOrderingTitle(section) }}
              </span>
              <span
                v-if="section.description"
                class="current-section-style"
                style="flex: 2; text-overflow: ellipsis"
              >
                {{ section.description }}
              </span>
              <span
                v-if="section.section_id === activeSection.section_id"
                class="current-section-text"
              >
                ({{ currentSection$() }})
              </span>
            </div>
          </DragHandle>
        </Draggable>
      </transition-group>
    </DragContainer>

    <div class="bottom-buttons-style">
      <KButton
        :primary="true"
        :text="applySettings$()"
        @click="applySettings()"
      />
    </div>

    <KModal
      v-if="showCloseConfirmation"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      :title="closeConfirmationTitle$()"
      @cancel="handleCancelClose"
      @submit="handleConfirmClose"
    >
      {{ closeConfirmationMessage$() }}
    </KModal>
  </div>

</template>


<script>

  import isEqual from 'lodash/isEqual';
  import { computed, ref } from 'vue';
  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import Draggable from 'kolibri-common/components/sortable/Draggable';
  import DragContainer from 'kolibri-common/components/sortable/DragContainer';
  import DragHandle from 'kolibri-common/components/sortable/DragHandle';
  import DragSortWidget from 'kolibri-common/components/sortable/DragSortWidget';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { PageNames } from '../../../constants/index';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import useDrag from './useDrag.js';

  export default {
    name: 'SectionOrder',
    components: {
      Draggable,
      DragContainer,
      DragHandle,
      DragSortWidget,
    },
    mixins: [commonCoreStrings],
    setup(_, context) {
      const {
        applySettings$,
        sectionOrderLabel$,
        currentSection$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
      } = enhancedQuizManagementStrings;

      const { activeSectionIndex, activeSection, allSections, updateQuiz } = injectQuizCreation();

      const { upLabel$, downLabel$ } = searchAndFilterStrings;

      const { moveDownOne, moveUpOne } = useDrag();

      const showCloseConfirmation = ref(false);

      function handleCancelClose() {
        showCloseConfirmation.value = false;
      }

      function handleConfirmClose() {
        context.emit('closePanel');
      }

      // This is used to track the section that was moved
      const reorderedSectionIndex = ref(null);

      const sectionOrderList = ref(allSections.value);

      const sectionOrderChanged = computed(() => {
        return !isEqual(
          allSections.value.map(section => section.section_id),
          sectionOrderList.value.map(section => section.section_id),
        );
      });

      const formDataHasChanged = computed(() => {
        return sectionOrderChanged.value;
      });

      return {
        reorderedSectionIndex,
        formDataHasChanged,
        sectionOrderChanged,
        showCloseConfirmation,
        handleCancelClose,
        handleConfirmClose,
        // useQuizCreation
        activeSectionIndex,
        activeSection,
        allSections,
        sectionOrderList,
        updateQuiz,
        // dragging a11y
        moveDownOne,
        moveUpOne,
        // i18n
        currentSection$,
        sectionOrderLabel$,
        applySettings$,
        closeConfirmationTitle$,
        closeConfirmationMessage$,
        upLabel$,
        downLabel$,
      };
    },
    computed: {
      borderStyle() {
        return `border: 1px solid ${this.$themeTokens.fineLine}`;
      },
      activeSectionStyles() {
        return {
          backgroundColor: this.$themePalette.grey.v_100,
          border: `1px solid ${this.$themeTokens.fineLine}`,
        };
      },
      draggableStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
        };
      },
    },
    beforeRouteLeave(to, __, next) {
      if (this.formDataHasChanged && !this.showCloseConfirmation) {
        this.showCloseConfirmation = true;
        next(false);
      } else {
        next();
      }
    },
    methods: {
      handleSectionSort(e) {
        this.sectionOrderList = e.newArray;
        const reorderedId = this.allSections[this.activeSectionIndex].section_id;
        this.reorderedSectionIndex = this.sectionOrderList.findIndex(
          section => section.section_id === reorderedId,
        );
      },
      applySettings(nextRouteName = PageNames.EXAM_CREATION_ROOT) {
        if (!this.sectionOrderChanged) {
          // TODO can we show an error here?
          return;
        }

        // Apply the new sorting to the updated sections,
        // otherwise the edits we just made will be lost
        const sectionOrderIds = this.sectionOrderList.map(section => section.section_id);
        const question_sources = this.allSections.sort((a, b) => {
          return sectionOrderIds.indexOf(a.section_id) - sectionOrderIds.indexOf(b.section_id);
        });
        this.updateQuiz({
          question_sources,
        });

        if (nextRouteName) {
          const sectionIndex =
            this.reorderedSectionIndex !== null &&
            this.reorderedSectionIndex !== this.activeSectionIndex
              ? this.reorderedSectionIndex
              : this.activeSectionIndex;

          this.$router.push({
            name: nextRouteName,
            params: {
              sectionIndex,
              classId: this.$route.params.classId,
              quizId: this.$route.params.quizId,
            },
          });
        } else {
          this.$emit('closePanel');
        }
      },
      handleKeyboardDragDown(oldIndex, array) {
        const newArray = this.moveDownOne(oldIndex, array);
        this.sectionOrderList = newArray;
      },
      handleKeyboardDragUp(oldIndex, array) {
        const newArray = this.moveUpOne(oldIndex, array);
        this.sectionOrderList = newArray;
      },
      sectionOrderingTitle(section) {
        const sectionIndexOrder = this.allSections.findIndex(
          s => s.section_id === section.section_id,
        );
        return displaySectionTitle(section, sectionIndexOrder).toUpperCase();
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .section-settings-content {
    margin-bottom: 7em;
  }

  .section-settings-heading {
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  .section-settings-top-heading {
    margin-top: 0;
    margin-bottom: 1.125em;
    font-size: 2em;
    font-weight: 600;
  }

  .section-order-list {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    height: 2.5em;
    margin-top: 0.5em;
    border: 1px solid;
    border-radius: 2px;
  }

  .space-content {
    margin: 0.5em;
    font-size: 1em;
  }

  .section-order-style {
    font-size: 1em;
  }

  .current-section-style {
    font-size: 1em;
  }

  .drag-title {
    display: inline-block;
    padding: 8px;
  }

  .bottom-buttons-style {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 1em;
    margin-top: 1em;
    text-align: right;
    background-color: #ffffff;
    border-top: 1px solid black;

    > div {
      padding-right: 1em;
    }
  }

  /deep/ .textbox {
    max-width: 100% !important;
  }

  .description-ktextbox-style /deep/ .ui-textbox-label {
    width: 100%;
  }

  .current-section-text {
    display: inline-block;
    flex: 1;
    margin-right: 0.5em;
    font-size: 0.9em;
    text-align: right;
  }

</style>
