<template>

  <div style="padding-top: 2rem; scroll: none;">
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
        :layout4="{ span: 2 }"
        :layout8="{ span: 5 }"
        :layout12="{ span: 10 }"
      >
        <KTabsList
          ref="tabsList"
          tabsId="quizSectionTabs"
          :tabs="tabs"
          :activeTabId="activeSection ?
            activeSection.section_id :
            '' "
          :aria-label="quizSectionsLabel$()"
          :tabAppearanceOverrides="tabStyles"
          :moreButtonTooltip="coreString('moreLabel')"
          @click="id => setActiveSection(id)"
        />
      </KGridItem>

      <KGridItem
        style="position: relative; right: 0; padding: 0 0.5em 0 1em; text-align: right;"
        :layout4="{ span: 2 }"
        :layout8="{ span: 3 }"
        :layout12="{ span: 2 }"
      >
        <KButton
          appearance="flat-button"
          icon="plus"
          style="height: 3.25rem; position: relative; right: 0; padding: 0;"
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
      <KGrid v-if="!activeQuestions.length" class="questions-list-label-row">
        <KGridItem
          class="right-side-heading"
          style="padding: 0.7em 0.75em;"
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
        style="text-align: center; padding: 0 0 1em 0; max-width: 350px; margin: 0 auto;"
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

        <p style="margin-top: 1em; font-weight: bold;">
          {{ noQuestionsInSection$() }}
        </p>

        <p>{{ addQuizSectionQuestionsInstructions$() }}</p>

        <KButton
          primary
          icon="plus"
          style="margin-top: 1em;"
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
            :layout8="{ span: 4 }"
            :layout4="{ span: 2 }"
          >
            <h2 :style="{ color: $themeTokens.annotation }">
              {{ questionList$() }}
            </h2>
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

        <AccordionContainer
          :items="activeQuestions.map(i => ({
            id: i.id,
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
                  :key="`drag-${question.id}`"
                  tabindex="-1"
                  style="background: white"
                >
                  <AccordionItem
                    :id="question.id"
                    :title="question.title"
                    :aria-selected="selectedActiveQuestions.includes(
                      question.id
                    )"
                  >
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
                            question.id
                          )"
                          @change="() => toggleQuestionInSelection(question.id)"
                        />
                        <KButton
                          tabindex="0"
                          appearance="basic-link"
                          :style="accordionStyleOverrides"
                          class="accordion-header-label"
                          :aria-expanded="isItemExpanded(question.id)"
                          :aria-controls="`question-panel-${question.id}`"
                          @click="toggleItemState(question.id)"
                        >
                          <span>{{ title + " " + question.counter_in_exercise }}</span>
                          <KIcon
                            style="position: absolute; right:0; top: 0.92em"
                            :icon="isItemExpanded(question.id) ?
                              'chevronUp' : 'chevronRight'"
                          />
                        </KButton>
                      </h3>
                    </template>
                    <template #content>
                      <div
                        v-if="isItemExpanded(question.id)"
                        :id="`question-panel-${question.id}`"
                        :ref="`question-panel-${question.id}`"
                        :style="{ userSelect: dragActive ? 'none!important' : 'text' }"
                      >
                        <ContentRenderer
                          :ref="`contentRenderer-${question.id}`"
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
          </template>
        </AccordionContainer>
      </div>

    </KTabsPanel>

    <KModal
      v-if="showDeleteConfirmation"
      :title="deleteSectionLabel$()"
      :submitText="coreString('deleteAction')"
      :cancelText="coreString('cancelAction')"
      @cancel="handleShowConfirmation"
      @submit="handleConfirmDelete"
    >
      {{ deleteConfirmation$({ section_title: activeSection.section_title }) }}
    </KModal>

  </div>

</template>


<script>

  import { get } from '@vueuse/core';
  import { ref } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import commonCoach from '../../common';
  import { PageNames } from '../../../constants';
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
        sectionDeletedNotification$,
        deleteConfirmation$,
        updateResources$,
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
        selectAllQuestions,

        // Computed
        toggleQuestionInSelection,
        channels,
        quiz,
        allSections,
        activeSection,
        inactiveSections,
        activeQuestionsPool,
        activeResourceMap,
        activeResourcePool,
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
        sectionDeletedNotification$,
        deleteConfirmation$,

        toggleQuestionInSelection,
        selectAllQuestions,
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
        updateResources$,

        // Computed
        channels,
        quiz,
        allSections,
        activeSection,
        inactiveSections,
        activeResourceMap,
        activeResourcePool,
        activeQuestionsPool,
        activeQuestions,
        selectedActiveQuestions,
        replacementQuestionPool,
      };
    },
    data() {
      return {
        showDeleteConfirmation: false,
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
          textOverflow: 'ellipsis',
          maxWidth: '10rem',
          height: '3.25rem',
          backgroundColor: 'transparent !important',
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
          {
            label: this.updateResources$(),
            icon: 'plus',
            id: 'plus',
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
      handleConfirmDelete() {
        const { section_id, section_title } = this.activeSection;
        this.removeSection(section_id);
        this.$nextTick(() => {
          this.$store.dispatch(
            'createSnackbar',
            this.sectionDeletedNotification$({ section_title })
          );
          // Run after the focus change of KModal destroyed method
          setTimeout(() => this.focusActiveSectionTab());
        });
        this.handleShowConfirmation();
      },
      handleShowConfirmation(section_id = null) {
        this.showDeleteConfirmation = section_id;
      },
      handleReplaceSelection() {
        const section_id = get(this.activeSection).section_id;
        const route = this.$router.getRoute(PageNames.QUIZ_REPLACE_QUESTIONS, { section_id });
        this.$router.push(route);
      },
      handleActiveSectionAction(opt) {
        const section_id = this.activeSection.section_id;
        const editRoute = this.$router.getRoute(PageNames.QUIZ_SECTION_EDITOR, { section_id });
        const resourcesRoute = this.$router.getRoute(PageNames.QUIZ_SELECT_RESOURCES, {
          section_id,
        });
        switch (opt.label) {
          case this.editSectionLabel$():
            this.$router.push(editRoute);
            break;
          case this.deleteSectionLabel$():
            this.handleShowConfirmation(section_id);
            break;
          case this.updateResources$():
            this.$router.push(resourcesRoute);
            break;
        }
      },
      focusActiveSectionTab() {
        const tabsList = this.$refs.tabsList;
        if (tabsList) {
          tabsList.focusActiveTab();
        }
      },
      handleQuestionOrderChange({ newArray }) {
        const payload = {
          section_id: get(this.activeSection).section_id,
          questions: newArray,
        };
        this.updateSection(payload);
        this.dragActive = false;
      },
      handleAddSection() {
        const newSection = this.addSection();
        this.setActiveSection(get(newSection).section_id);
        this.sectionCreationCount++;
      },
      handleDragStart() {
        // Used to mitigate the issue of text being selected while dragging
        this.dragActive = true;
      },
      openSelectResources(section_id) {
        const route = this.$router.getRoute(PageNames.QUIZ_SELECT_RESOURCES, { section_id });
        this.$router.push(route);
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
