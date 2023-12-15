<template>

  <div style="padding-top: 2rem;">
    <KGrid>
      <KGridItem
        :layout4="{ span: 1 }"
        :layout8="{ span: 1 }"
        :layout12="{ span: 1 }"
      >
        <KIcon
          icon="quiz"
          class="style-icon"
        />
      </KGridItem>

      <KGridItem
        :layout4="{ span: 3 }"
        :layout8="{ span: 7 }"
        :layout12="{ span: 11 }"
      >
        <KTextbox
          ref="title"
          :label="quizTitle$()"
          :autofocus="true"
          :maxlength="100"
          @blur="e => updateQuiz({ title: e.target.value })"
          @change="title => updateQuiz({ title })"
        />
      </KGridItem>
    </KGrid>

    <p :style="addQuizSectionsStyles">
      {{ addQuizSections$() }}
    </p>

    <KGrid :style="tabsWrapperStyles">
      <KGridItem
        :layout4="{ span: 3 }"
        :layout8="{ span: 6 }"
        :layout12="{ span: 10 }"
      >
        <TabsWithOverflow
          tabsId="quizSectionTabs"
          class="section-tabs"
          :tabs="tabs"
          :appearanceOverrides="{ padding: '0px', overflow: 'hidden' }"
          :activeTabId="activeSection ?
            activeSection.section_id :
            '' "
          backgroundColor="transparent"
          hoverBackgroundColor="transparent"
          :aria-label="quizSectionsLabel$()"
          @click="id => setActiveSection(id)"
        >
          <template #tab="{ tab }">
            <span
              :ref="tabRefLabel(tab.id)"
              appearance="flat-button"
              style="display: inline-block;"
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
        style="padding: 0; margin-right: 0;"
        :layout4="{ span: 1 }"
        :layout8="{ span: 2 }"
        :layout12="{ span: 2 }"
      >
        <KButton
          appearance="flat-button"
          icon="plus"
          style="height: 3rem"
          @click="handleAddSection"
        >
          {{ addSectionLabel$() }}
        </KButton>
      </KGridItem>

    </KGrid>

    <KTabsPanel
      v-if="activeSection"
      tabsId="quizSectionTabs"
      :activeTabId="activeSection ? activeSection.section_id : ''"
    >
      <p>{{ activeSection.section_id }}</p>
      <!-- TODO This should be a separate component like "empty section container" or something -->
      <div v-if="!activeQuestions.length" class="no-question-style">
        <KGrid class="questions-list-label-row">
          <KGridItem
            class="right-side-heading"
            style="padding: 0.7em 0.75em;"
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
                  @tab="e => (e.preventDefault() || $refs.selectAllCheckbox.focus())"
                  @select="handleActiveSectionAction"
                />
              </template>
            </KButton>
          </KGridItem>
        </KGrid>
        <div class="question-mark-layout">
          <span class="help-icon-style">?</span>
        </div>

        <p class="no-question-style">
          {{ noQuestionsInSection$() }}
        </p>

        <p>{{ addQuizSectionQuestionsInstructions$() }}</p>

        <KButton
          primary
          icon="plus"
          @click="openSelectResources(activeSection.section_id)"
        >
          {{ addQuestionsLabel$() }}
        </KButton>
      </div>

      <div v-else>
        <KGrid class="questions-list-label-row">
          <KGridItem
            class="left-side-heading"
            :layout12="{ span: 6 }"
          >
            <h2 :style="{ color: $themeTokens.annotation }">
              {{ questionList$() }}
            </h2>
          </KGridItem>
          <KGridItem
            class="right-side-heading"
            :layout12="{ span: 6 }"
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
                  @tab="e => (e.preventDefault() || $refs.selectAllCheckbox.focus())"
                  @select="handleActiveSectionAction"
                />
              </template>
            </KButton>
          </KGridItem>
        </KGrid>

        <AccordionContainer
          :items="activeQuestions.map(i => ({
            id: i.question_id,
          }))"
        >
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
              icon="refresh"
              :tooltip="replaceAction$()"
              :disabled="selectedActiveQuestions.length === 0"
              @click="handleReplaceSelection()"
            />
            <KIconButton
              icon="trash"
              :tooltip="coreString('deleteAction')"
              :aria-label="coreString('deleteAction')"
              :disabled="selectedActiveQuestions.length === 0"
              @click="deleteActiveSelectedQuestions()"
            />
          </template>
          <template #default="{ toggleItemState, isItemExpanded }">
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
                  :key="`drag-${question.question_id}`"
                  tabindex="-1"
                  style="background: white"
                >
                  <AccordionItem :id="question.question_id" :title="question.title">
                    <template #heading="{ title }">
                      <h3
                        class="accordion-header"
                      >
                        <DragHandle>
                          <div>
                            <DragSortWidget
                              class="sort-widget"
                              moveUpText="up"
                              moveDownText="down"
                              :noDrag="true"
                              :isFirst="index === 0"
                              :isLast="index === activeQuestions.length - 1"
                              @moveUp="shiftOne(index, -1)"
                              @moveDown="shiftOne(index, +1)"
                            />
                          </div>
                        </DragHandle>
                        <KCheckbox
                          style="padding-left: 0.5em"
                          :checked="selectedActiveQuestions.includes(
                            question.question_id
                          )"
                          @change="() => toggleQuestionInSelection(question.question_id)"
                        />
                        <KButton
                          tabindex="0"
                          appearance="basic-link"
                          :style="accordionStyleOverrides"
                          class="accordion-header-label"
                          :aria-expanded="isItemExpanded(question.question_id)"
                          :aria-controls="`question-panel-${question.question_id}`"
                          @click="toggleItemState(question.question_id)"
                        >
                          <span>{{ title }}</span>
                          <KIcon
                            style="position: absolute; right:0; top: 0.92em"
                            :icon="isItemExpanded(question.question_id) ?
                              'chevronUp' : 'chevronRight'"
                          />
                        </KButton>
                      </h3>
                    </template>
                    <template #content>
                      <div
                        :id="`question-panel-${question.question_id}`"
                        :ref="`question-panel-${question.question_id}`"
                        :style="{ userSelect: dragActive ? 'none!important' : 'text' }"
                      >
                        <p
                          v-if="isItemExpanded(question.question_id) && !dragActive"
                          class="question-content-panel"
                        >
                          CONTENT OF {{ question.title }}
                        </p>
                      </div>
                    </template>
                  </AccordionItem>
                </Draggable>
              </transition-group>
            </DragContainer>
          </template>
        </AccordionContainer>
      </div>

    </KTabsPanel>

    <SectionSidePanel @closePanel="focusActiveSectionTab()" />
  </div>

</template>


<script>

  import { get, set } from '@vueuse/core';
  import { ref } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import commonCoach from '../../common';
  import SectionSidePanel from './SectionSidePanel';
  import TabsWithOverflow from './TabsWithOverflow';
  import AccordionContainer from './AccordionContainer';
  import AccordionItem from './AccordionItem';

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
      SectionSidePanel,
    },
    mixins: [commonCoreStrings, commonCoach],
    setup() {
      const {
        sectionLabel$,
        selectAllLabel$,
        addQuizSections$,
        addSectionLabel$,
        quizTitle$,
        quizSectionsLabel$,
        addQuestionsLabel$,
        noQuestionsInSection$,
        addQuizSectionQuestionsInstructions$,
        editSectionLabel$,
        deleteSectionLabel$,
        replaceAction$,
        questionList$,
      } = enhancedQuizManagementStrings;

      const {
        // Methods
        saveQuiz,
        updateSection,
        allQuestionsSelected,
        selectAllIsIndeterminate,
        deleteActiveSelectedQuestions,
        replaceSelectedQuestions,
        addSection,
        removeSection,
        setActiveSection,
        initializeQuiz,
        updateQuiz,
        addQuestionToSelection,
        removeQuestionFromSelection,

        // Computed
        channels,
        quiz,
        allSections,
        activeSection,
        inactiveSections,
        activeExercisePool,
        activeQuestionsPool,
        activeQuestions,
        selectedActiveQuestions,
        replacementQuestionPool,
      } = injectQuizCreation();

      // The number we use for the default section title
      const sectionCreationCount = ref(1);
      const dragActive = ref(false);

      return {
        dragActive,
        sectionCreationCount,
        sectionLabel$,
        selectAllLabel$,
        addQuizSections$,
        quizSectionsLabel$,
        addSectionLabel$,
        quizTitle$,
        addQuestionsLabel$,
        noQuestionsInSection$,
        addQuizSectionQuestionsInstructions$,
        editSectionLabel$,
        deleteSectionLabel$,
        replaceAction$,
        questionList$,

        saveQuiz,
        updateSection,
        allQuestionsSelected,
        selectAllIsIndeterminate,
        deleteActiveSelectedQuestions,
        replaceSelectedQuestions,
        addSection,
        removeSection,
        setActiveSection,
        initializeQuiz,
        updateQuiz,
        addQuestionToSelection,
        removeQuestionFromSelection,

        // Computed
        channels,
        quiz,
        allSections,
        activeSection,
        inactiveSections,
        activeExercisePool,
        activeQuestionsPool,
        activeQuestions,
        selectedActiveQuestions,
        replacementQuestionPool,
      };
    },
    computed: {
      accordionStyleOverrides() {
        return {
          color: this.$themeTokens.text + '!important',
          textDecoration: 'none',
          // Ensure text doesn't get highlighted as we drag
          userSelect: get(this.dragActive) ? 'none!important' : 'text',
        };
      },
      addQuizSectionsStyles() {
        return {
          margin: '0 0 1rem 0',
          padding: '0 0 1rem 0',
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
        };
      },
      tabsWrapperStyles() {
        return {
          paddingTop: '1rem',
          borderBottom: `1px solid ${this.$themeTokens.fineLine}`,
          flexWrap: 'nowrap',
        };
      },
      tabs() {
        return get(this.allSections).map(section => {
          const id = section.section_id;
          const label = section.section_title;
          return { id, label };
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
        ];
      },
    },
    methods: {
      handleReplaceSelection() {
        const section_id = get(this.activeSection).section_id;
        this.$router.replace({ path: 'new/' + section_id + '/replace-questions' });
      },
      handleActiveSectionAction(opt) {
        const section_id = this.activeSection.section_id;
        switch (opt.label) {
          case this.editSectionLabel$():
            this.$router.replace({ path: 'new/' + section_id + '/edit' });
            break;
          case this.deleteSectionLabel$():
            this.removeSection(this.activeSection.section_id);
            this.focusActiveSectionTab();
            break;
        }
      },
      tabRefLabel(section_id) {
        return `section-tab-${section_id}`;
      },
      focusActiveSectionTab() {
        const label = this.tabRefLabel(this.activeSection.section_id);
        const tabRef = this.$refs[label];
        // TODO Consider the "Delete section" button on the side panel; maybe we need to await
        // nextTick if we're getting the error
        if (tabRef) {
          tabRef.focus();
        } else {
          console.error(
            'Tried to focus active tab id: ',
            label,
            ' - but the tab is not in the refs: ',
            this.$refs
          );
        }
      },
      activeSectionIsHidden(overflow) {
        const ids = overflow.map(i => i.id);
        return ids.includes(get(this.activeSection).section_id);
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
        set(this.dragActive, false);
        const payload = {
          section_id: get(this.activeSection).section_id,
          questions: newArray,
        };
        this.updateSection(payload);
      },
      handleAddSection() {
        const newSection = this.addSection();
        this.setActiveSection(get(newSection).section_id);
        this.sectionCreationCount++;
      },
      handleDragStart() {
        set(this.dragActive, true);
      },
      openSelectResources(section_id) {
        this.$router.replace({ path: 'new/' + section_id + '/select-resources' });
      },
    },
  };

</script>


<style lang="scss"  scoped>

  .style-icon {
    width: 2em;
    height: 2em;
    margin-top: 0.5em;
    margin-left: 1em;
  }

  /deep/ .ui-textbox-label {
    width: 100% !important;
  }

  /deep/ .textbox {
    width: 100% !important;
    max-width: 100%;
    margin-left: -1em;
  }

  .no-question-layout {
    width: auto;
    padding: 40px;
    text-align: center;
    background-color: #fafafa;
    border: 1px;
    border-radius: 0.5em;
  }

  .question-mark-layout {
    align-items: center;
    width: 2.5em;
    height: 2.5em;
    margin: auto;
    background-color: #dbc3d4;
  }

  .help-icon-style {
    font-size: 1.5em;
    font-weight: 700;
    color: #996189;
  }

  .no-question-style {
    font-weight: bold;
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

</style>
