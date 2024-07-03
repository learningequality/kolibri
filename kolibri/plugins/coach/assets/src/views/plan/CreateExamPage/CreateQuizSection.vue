<template>

  <div>
    <KGrid :style="tabsWrapperStyles">
      <KGridItem
        :layout4="{ span: 2 }"
        :layout8="{ span: 5 }"
        :layout12="{ span: 10 }"
      >
        <TabsWithOverflow
          tabsId="quizSectionTabs"
          class="section-tabs"
          :tabs="tabs"
          :activeTabId="String(activeSectionIndex)"
          backgroundColor="transparent"
          hoverBackgroundColor="transparent"
          :aria-label="quizSectionsLabel$()"
          @click="id => setActiveSection(id)"
        >
          <template #tab="{ tab }">
            <span
              :ref="tabRefLabel(tab.id)"
              appearance="flat-button"
              style="display: inline-block"
              :appearanceOverrides="tabStyles"
            >
              {{ tab.label }}
            </span>
          </template>

          <template #overflow="{ overflowTabs }">
            <KIconButton
              v-if="overflowTabs.length"
              tabindex="-1"
              class="overflow-tabs"
              icon="optionsHorizontal"
              :style="overflowButtonStyles(overflowTabs)"
            >
              <template #menu>
                <KDropdownMenu
                  :primary="false"
                  :disabled="false"
                  :hasIcons="true"
                  :options="overflowTabs"
                  @select="opt => setActiveSection(opt.id)"
                />
              </template>
            </KIconButton>
          </template>
        </TabsWithOverflow>
      </KGridItem>

      <KGridItem
        style="position: relative; right: 0; padding: 0 0.5em 0 1em; text-align: right"
        :layout4="{ span: 2 }"
        :layout8="{ span: 3 }"
        :layout12="{ span: 2 }"
      >
        <KButton
          appearance="flat-button"
          icon="plus"
          style="position: relative; right: 0; height: 3rem; padding: 0"
          @click="handleAddSection"
        >
          {{ addSectionLabel$() }}
        </KButton>
      </KGridItem>
    </KGrid>

    <KTabsPanel
      v-if="activeSection"
      tabsId="quizSectionTabs"
      :activeTabId="String(activeSectionIndex)"
    >
      <KGrid
        v-if="!activeQuestions.length"
        class="questions-list-label-row"
      >
        <KGridItem
          class="right-side-heading"
          style="padding: 0.7em 0.75em"
        >
          <KButton
            ref="addQuestionsButton"
            primary
            :text="coreString('optionsLabel')"
          >
            <template #menu>
              <KDropdownMenu
                :primary="false"
                :disabled="false"
                :hasIcons="true"
                :options="activeSectionActions"
                @tab="$refs.addQuestionsButton.$el.focus()"
                @close="$refs.addQuestionsButton.$el.focus()"
                @select="handleActiveSectionAction"
              />
            </template>
          </KButton>
        </KGridItem>
      </KGrid>
      <!-- TODO This should be a separate component like "empty section container" or something -->
      <div
        v-if="!activeQuestions.length"
        style="max-width: 350px; padding: 0 0 1em; margin: 0 auto; text-align: center"
      >
        <!-- TODO This question mark thing should probably be an SVG for improved a11y -->
        <div
          class="question-mark-layout"
          :style="{ backgroundColor: $themeBrand.secondary.v_200 }"
        >
          <span
            class="help-icon-style"
            :style="{ color: $themeTokens.secondaryDark }"
          >?</span>
        </div>

        <p style="margin-top: 1em; font-weight: bold">
          {{ noQuestionsInSection$() }}
        </p>

        <p>{{ addQuizSectionQuestionsInstructions$() }}</p>

        <KButton
          primary
          icon="plus"
          style="margin-top: 1em"
          @click="openSelectResources()"
        >
          {{ addQuestionsLabel$() }}
        </KButton>
      </div>

      <div v-else>
        <KGrid class="questions-list-label-row">
          <KGridItem
            class="left-side-heading"
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <h2 :style="{ color: $themeTokens.annotation }">
              {{ questionsLabel$() }}
            </h2>
            <p :style="{ color: $themeTokens.annotation, fontSize: '.75rem' }">
              {{ numberOfReplacementsAvailable$({ count: replacementQuestionPool.length }) }}
            </p>
          </KGridItem>
          <KGridItem
            class="right-side-heading"
            :layout12="{ span: 6 }"
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <KButton
              primary
              :text="coreString('optionsLabel')"
            >
              <template #menu>
                <KDropdownMenu
                  :primary="false"
                  :disabled="false"
                  :hasIcons="true"
                  :options="activeSectionActions"
                  @select="handleActiveSectionAction"
                />
              </template>
            </KButton>
          </KGridItem>
        </KGrid>

        <AccordionContainer :items="activeQuestions">
          <template #left-actions>
            <KCheckbox
              ref="selectAllCheckbox"
              class="select-all-box"
              :label="selectAllLabel$()"
              :checked="allQuestionsSelected"
              :indeterminate="selectAllIsIndeterminate"
              @change="() => selectAllQuestions()"
            />
          </template>
          <template #right-actions>
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
            <KIconButton
              icon="refresh"
              :tooltip="replaceAction$()"
              :disabled="!canReplaceQuestions"
              @click="handleReplaceSelection()"
            />
            <KIconButton
              icon="trash"
              :tooltip="coreString('deleteAction')"
              :aria-label="coreString('deleteAction')"
              :disabled="selectedActiveQuestions.length === 0"
              @click="() => deleteQuestions()"
            />
          </template>

          <DragContainer
            key="drag-container"
            :items="activeQuestions"
            @sort="handleQuestionOrderChange"
            @dragStart="handleDragStart"
          >
            <transition-group
              tag="div"
              name="list"
              class="wrapper"
            >
              <Draggable
                v-for="(question, index) in activeQuestions"
                :key="`drag-${question.item}`"
                tabindex="-1"
                style="background: white"
              >
                <AccordionItem
                  :id="question.item"
                  :title="
                    displayQuestionTitle(question, activeResourceMap[question.exercise_id].title)
                  "
                  :aria-selected="selectedActiveQuestions.includes(question.item)"
                >
                  <template #heading="{ title }">
                    <h3 class="accordion-header">
                      <DragHandle>
                        <div>
                          <DragSortWidget
                            class="sort-widget"
                            moveUpText="up"
                            moveDownText="down"
                            :noDrag="true"
                            :isFirst="index === 0"
                            :isLast="index === activeQuestions.length - 1"
                            @moveUp="() => handleKeyboardDragUp(index, activeQuestions)"
                            @moveDown="() => handleKeyboardDragDown(index, activeQuestions)"
                          />
                        </div>
                      </DragHandle>
                      <KCheckbox
                        style="padding-left: 0.5em"
                        :checked="selectedActiveQuestions.includes(question.item)"
                        @change="() => toggleQuestionInSelection(question.item)"
                      />
                      <KButton
                        tabindex="0"
                        appearance="basic-link"
                        :style="accordionStyleOverrides"
                        class="accordion-header-label"
                        :aria-expanded="isExpanded(index)"
                        :aria-controls="`question-panel-${question.item}`"
                        @click="toggle(index)"
                      >
                        <span>{{ title }}</span>
                        <KIcon
                          style="position: absolute; top: 0.92em; right: 0"
                          :icon="isExpanded(index) ? 'chevronUp' : 'chevronRight'"
                        />
                      </KButton>
                    </h3>
                  </template>
                  <template #content>
                    <div
                      v-if="isExpanded(index)"
                      :id="`question-panel-${question.item}`"
                      :ref="`question-panel-${question.item}`"
                      :style="{ userSelect: dragActive ? 'none!important' : 'text' }"
                    >
                      <ContentRenderer
                        :ref="`contentRenderer-${question.item}`"
                        :kind="activeResourceMap[question.exercise_id].kind"
                        :lang="activeResourceMap[question.exercise_id].lang"
                        :files="activeResourceMap[question.exercise_id].files"
                        :available="activeResourceMap[question.exercise_id].available"
                        :itemId="question.question_id"
                        :assessment="true"
                        :allowHints="false"
                        :interactive="false"
                        @interaction="() => null"
                        @updateProgress="() => null"
                        @updateContentState="() => null"
                        @error="err => $emit('error', err)"
                      />
                    </div>
                  </template>
                </AccordionItem>
              </Draggable>
            </transition-group>
          </DragContainer>
        </AccordionContainer>
      </div>
    </KTabsPanel>
    <FocusTrap>
      <KModal
        v-if="showDeleteConfirmation"
        :title="deleteSectionLabel$()"
        :submitText="coreString('deleteAction')"
        :cancelText="coreString('cancelAction')"
        @cancel="showDeleteConfirmation = false"
        @submit="handleConfirmDelete"
      >
        {{
          deleteConfirmation$({
            section_title: displaySectionTitle(activeSection, activeSectionIndex),
          })
        }}
      </KModal>
    </FocusTrap>
  </div>

</template>


<script>

  import { ref } from 'kolibri.lib.vueCompositionApi';
  import logging from 'kolibri.lib.logging';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
    displayQuestionTitle,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import { MAX_QUESTIONS_PER_QUIZ_SECTION } from 'kolibri.coreVue.vuex.constants';
  import AccordionItem from 'kolibri-common/components/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/AccordionContainer';
  import useAccordion from 'kolibri-common/components/useAccordion';
  import FocusTrap from 'kolibri.coreVue.components.FocusTrap';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import commonCoach from '../../common';
  import { PageNames } from '../../../constants';
  import useDrag from './useDrag.js';
  import TabsWithOverflow from './TabsWithOverflow';

  const logger = logging.getLogger(__filename);

  export default {
    name: 'CreateQuizSection',
    components: {
      AccordionContainer,
      AccordionItem,
      DragContainer,
      Draggable,
      DragSortWidget,
      DragHandle,
      TabsWithOverflow,
      FocusTrap,
    },
    mixins: [commonCoreStrings, commonCoach],
    setup() {
      const {
        sectionLabel$,
        selectAllLabel$,
        addSectionLabel$,
        quizSectionsLabel$,
        addQuestionsLabel$,
        addMoreQuestionsLabel$,
        noQuestionsInSection$,
        addQuizSectionQuestionsInstructions$,
        editSectionLabel$,
        deleteSectionLabel$,
        replaceAction$,
        questionsLabel$,
        numberOfReplacementsAvailable$,
        sectionDeletedNotification$,
        deleteConfirmation$,
        questionsDeletedNotification$,
        expandAll$,
        collapseAll$,
        questionDeletionConfirmation$,
      } = enhancedQuizManagementStrings;

      const {
        // Methods
        updateSection,
        allQuestionsSelected,
        selectAllIsIndeterminate,
        deleteActiveSelectedQuestions,
        addSection,
        removeSection,
        updateQuiz,
        selectAllQuestions,
        replacementQuestionPool,
        // Computed
        toggleQuestionInSelection,
        allSections,
        activeSectionIndex,
        activeSection,
        activeResourceMap,
        activeResourcePool,
        activeQuestions,
        selectedActiveQuestions,
      } = injectQuizCreation();

      const {
        collapse,
        collapseAll,
        expand,
        expandAll,
        isExpanded,
        toggle,
        canCollapseAll,
        canExpandAll,
      } = useAccordion(activeQuestions);

      const { moveUpOne, moveDownOne } = useDrag();
      const dragActive = ref(false);

      return {
        canCollapseAll,
        canExpandAll,
        collapse,
        collapseAll,
        expand,
        expandAll,
        isExpanded,
        toggle,

        dragActive,
        sectionLabel$,
        expandAll$,
        collapseAll$,
        selectAllLabel$,
        quizSectionsLabel$,
        addSectionLabel$,
        addQuestionsLabel$,
        addMoreQuestionsLabel$,
        noQuestionsInSection$,
        addQuizSectionQuestionsInstructions$,
        editSectionLabel$,
        deleteSectionLabel$,
        questionDeletionConfirmation$,
        replaceAction$,
        questionsLabel$,
        numberOfReplacementsAvailable$,
        sectionDeletedNotification$,
        deleteConfirmation$,
        questionsDeletedNotification$,

        toggleQuestionInSelection,
        selectAllQuestions,
        updateSection,
        allQuestionsSelected,
        selectAllIsIndeterminate,
        deleteActiveSelectedQuestions,
        addSection,
        removeSection,
        updateQuiz,
        displaySectionTitle,
        displayQuestionTitle,

        moveDownOne,
        moveUpOne,

        // Computed
        allSections,
        activeSectionIndex,
        activeSection,
        activeResourceMap,
        activeResourcePool,
        replacementQuestionPool,
        activeQuestions,
        selectedActiveQuestions,
      };
    },
    data() {
      return {
        showDeleteConfirmation: false,
        showNotEnoughResourcesModal: false,
      };
    },
    computed: {
      accordionStyleOverrides() {
        return {
          color: this.$themeTokens.text + '!important',
          textDecoration: 'none',
          // Ensure text doesn't get highlighted as we drag
          userSelect: this.dragActive ? 'none!important' : 'text',
        };
      },
      canReplaceQuestions() {
        return (
          this.selectedActiveQuestions.length > 0 &&
          this.selectedActiveQuestions.length <= this.replacementQuestionPool.length
        );
      },
      tabsWrapperStyles() {
        return {
          paddingTop: '1rem',
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          flexWrap: 'nowrap',
        };
      },
      tabs() {
        return this.allSections.map((section, index) => {
          const label = this.displaySectionTitle(section, index);
          // The active index will be coerced to a string,
          // so make sure to cast the index to a string as well
          return { id: String(index), label };
        });
      },
      tabStyles() {
        return {
          margin: '0px',
          textOverflow: 'ellipsis',
          maxWidth: '10rem',
          padding: '1rem 0!important',
          height: '3.25rem',
        };
      },
      activeSectionActions() {
        const addQuestionsLabel = this.activeQuestions.length
          ? this.addMoreQuestionsLabel$()
          : this.addQuestionsLabel$();
        return [
          {
            label: this.editSectionLabel$(),
            icon: 'edit',
            id: 'edit',
          },
          {
            label: this.deleteSectionLabel$(),
            icon: 'delete',
            id: 'delete',
          },
          {
            label: addQuestionsLabel,
            icon: 'plus',
            id: 'plus',
            disabled: this.activeQuestions.length >= MAX_QUESTIONS_PER_QUIZ_SECTION,
          },
        ];
      },
    },
    created() {
      const { query } = this.$route;
      if (query.snackbar) {
        delete query.snackbar;
        this.$router.replace({ query: { snackbar: null } });
      }
    },
    methods: {
      getCurrentRouteParams() {
        return {
          classId: this.$route.params.classId,
          quizId: this.$route.params.quizId,
          sectionIndex: this.$route.params.sectionIndex,
        };
      },
      setActiveSection(sectionIndex = null) {
        if (sectionIndex === null) {
          sectionIndex = 0;
        }
        if (!this.allSections[sectionIndex]) {
          throw new Error(`Section with id ${sectionIndex} not found; cannot be set as active.`);
        }
        if (sectionIndex !== this.activeSectionIndex) {
          this.$router.push({
            ...this.$route,
            params: { ...this.getCurrentRouteParams(), sectionIndex },
          });
        }
      },
      handleConfirmDelete() {
        const section_title = displaySectionTitle(this.activeSection, this.activeSectionIndex);
        const newIndex = this.activeSectionIndex > 0 ? this.activeSectionIndex - 1 : 0;
        this.setActiveSection(newIndex);
        this.removeSection(this.activeSectionIndex);
        this.$nextTick(() => {
          this.$store.dispatch(
            'createSnackbar',
            this.sectionDeletedNotification$({ section_title }),
          );
          this.focusActiveSectionTab();
        });
        this.showDeleteConfirmation = false;
      },
      handleReplaceSelection() {
        if (this.replacementQuestionPool.length < this.selectedActiveQuestions.length) {
          this.showNotEnoughResourcesModal = true;
        } else {
          this.$router.push({
            name: PageNames.QUIZ_REPLACE_QUESTIONS,
            params: this.getCurrentRouteParams(),
          });
        }
      },
      handleActiveSectionAction(opt) {
        switch (opt.id) {
          case 'edit':
            this.$router.push({
              name: PageNames.QUIZ_SECTION_EDITOR,
              params: this.getCurrentRouteParams(),
            });
            break;
          case 'delete':
            this.showDeleteConfirmation = true;
            break;
          case 'plus':
            this.$router.push({
              name: PageNames.QUIZ_SELECT_RESOURCES,
              params: this.getCurrentRouteParams(),
            });
            break;
        }
      },
      tabRefLabel(sectionIndex) {
        return `section-tab-${sectionIndex}`;
      },
      focusActiveSectionTab() {
        const label = this.tabRefLabel(this.activeSectionIndex);
        const tabRef = this.$refs[label];

        // TODO Consider the "Delete section" button on the side panel; maybe we need to await
        // nextTick if we're getting the error
        if (tabRef) {
          tabRef.focus();
        } else {
          logger.error(
            'Tried to focus active tab id: ',
            label,
            ' - but the tab is not in the refs: ',
            this.$refs,
          );
        }
      },
      activeSectionIsHidden(overflow) {
        return this.allSections.length - overflow.length <= this.activeSectionIndex;
      },
      overflowButtonStyles(overflow) {
        return {
          height: '2.25rem!important',
          width: '2.25rem!important',
          border: this.activeSectionIsHidden(overflow)
            ? '2px solid ' + this.$themeTokens.primary
            : 'none',
        };
      },
      handleQuestionOrderChange({ newArray }) {
        const payload = {
          sectionIndex: this.activeSectionIndex,
          questions: newArray,
        };
        this.updateSection(payload);
        this.dragActive = false;
      },
      handleAddSection() {
        this.addSection();
        this.$router.push({
          name: PageNames.QUIZ_SECTION_EDITOR,
          params: { sectionIndex: this.allSections.length - 1 },
        });
      },
      handleDragStart() {
        // Used to mitigate the issue of text being selected while dragging
        this.dragActive = true;
      },
      handleKeyboardDragDown(oldIndex, array) {
        const newArray = this.moveDownOne(oldIndex, array);
        this.handleQuestionOrderChange({ newArray });
      },
      handleKeyboardDragUp(oldIndex, array) {
        const newArray = this.moveUpOne(oldIndex, array);
        this.handleQuestionOrderChange({ newArray });
      },
      openSelectResources() {
        this.$router.push({
          name: PageNames.QUIZ_SELECT_RESOURCES,
          params: this.getCurrentRouteParams(),
        });
      },
      deleteQuestions() {
        const count = this.selectedActiveQuestions.length;
        this.deleteActiveSelectedQuestions();
        this.$store.dispatch(
          'createSnackbar',
          this.questionsDeletedNotification$({
            count,
          }),
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  .no-question-layout {
    width: auto;
    padding: 40px;
    text-align: center;
    background-color: #fafafa;
    border: 1px;
    border-radius: 0.5em;
  }

  .question-mark-layout {
    width: 2.5em;
    height: 2.5em;
    margin: auto;
    line-height: 1.7;
    text-align: center;
  }

  .help-icon-style {
    font-size: 1.5em;
    font-weight: 700;
    color: #996189;
  }

  .kgrid-alignment-style {
    padding-right: 1em;
    padding-left: 0;
    text-align: left;
  }

  .left-column-alignment-style {
    display: inline-flex;
    margin-left: 1em;
  }

  .drag-icon {
    margin-top: -0.5em;
    font-size: 1em;
  }

  .float-item-left-style {
    float: right;
    margin-top: 1em;
    margin-right: 0.5em;
  }

  .reduce-chervon-spacing {
    padding: 0;
    margin: 0;
    font-size: 1em;
  }

  .icon-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
    margin: 0;
  }

  .choose-question {
    height: 40px;
    margin-top: 0.5em;
    background-color: #fafafa;
    border: 1px solid #dedede;
    border-radius: 2px;
  }

  .space-content {
    margin: 0.5em;
    font-size: 1em;
    font-weight: 700;
  }

  .check-box-style {
    margin-top: 0.5em;
    margin-left: 0.5em;
  }

  .toggle-icon {
    margin: 0.5em;
    font-size: 1em;
  }

  .remove-button-style {
    width: 100%;
    padding: 0;
    background-color: transparent;
    border: 0;
  }

  .occupy-remaining-space {
    flex-grow: 1;
  }

  .flex-div {
    display: flex;
  }

  .text-align-start {
    text-align: start;
  }

  .text-vertical-spacing {
    margin-top: 0.5em;
  }

  .limit-height {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
    margin-bottom: -8px;
    text-align: left;
  }

  .options-button {
    width: 3.25em !important;
    height: 3.25em !important;
    margin: 0;
    border-radius: 0 !important;
  }

  /deep/ .ui-menu {
    min-width: 17rem;
    max-width: 25rem;
  }

  .menu-button {
    width: calc(100% - 40px);
    max-width: calc(100% - 40px) !important;
    min-height: 40px;
  }

  .accordion-header {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    padding: 0 0.5em !important;
    margin: 0.25em 0;
  }

  .accordion-header-label {
    position: relative;
    flex-grow: 1;
    align-self: stretch;
    padding: 0 0 0 1em;
    line-height: 2.75em;
    text-align: left;
    cursor: pointer;
  }

  /deep/ .checkbox-icon {
    top: 2px;
  }

  /deep/ .grip {
    top: 2px !important;
  }

  /deep/ .overflow-tabs svg {
    top: 5px !important;
  }

  .select-all-box {
    margin-top: 0;
    margin-bottom: 0;
    margin-left: 2.5em;

    // Vertical centering here into the KCheckbox
    /deep/ & label {
      line-height: 28px;
    }
  }

  .right-side-heading {
    display: flex;
    flex-direction: row-reverse;
  }

  .left-side-heading {
    display: flex;
    align-items: center;
  }

  .questions-list-label-row {
    /deep/ & > div {
      align-items: center;
    }
  }

  .question-content-panel {
    padding-left: 5.5em;
  }

  /deep/ .sortable-handled {
    align-self: flex-end;
  }

  // This makes sure that the keyboard focus ring is visible on the section tabs
  /deep/ .tab {
    outline-offset: -5px !important;
  }

</style>
