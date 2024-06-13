<template>

  <div>
    <p :style="addQuizSectionsStyles">
      {{ addQuizSections$() }}
    </p>

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
        style="position: relative; right: 0; padding: 0 0.5em 0 1em; text-align: right;"
        :layout4="{ span: 2 }"
        :layout8="{ span: 3 }"
        :layout12="{ span: 2 }"
      >
        <KButton
          appearance="flat-button"
          icon="plus"
          style="height: 3rem; position: relative; right: 0; padding: 0;"
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
              :disabled="selectedActiveQuestions.length === 0"
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
                  :title="question.title"
                  :aria-selected="selectedActiveQuestions.includes(
                    question.item
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
                          question.item
                        )"
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
                        <span>{{ title + " " + question.counter_in_exercise }}</span>
                        <KIcon
                          style="position: absolute; right:0; top: 0.92em"
                          :icon="isExpanded(index) ?
                            'chevronUp' : 'chevronRight'"
                        />
                      </KButton>
                    </h3>
                  </template>
                  <template #content>
                    <div
                      v-if="isExpanded(index)"
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
        </AccordionContainer>
      </div>

    </KTabsPanel>

    <NotEnoughResourcesModal
      v-if="showNotEnoughResourcesModal"
      :selectedQuestions="selectedActiveQuestions"
      :availableResources="replacementQuestionPool"
      @close="showNotEnoughResourcesModal = false"
      @addResources="redirectToSelectResources"
    />
    <KModal
      v-if="showDeleteConfirmation"
      :title="deleteSectionLabel$()"
      :submitText="coreString('deleteAction')"
      :cancelText="coreString('cancelAction')"
      @cancel="handleShowConfirmation"
      @submit="handleConfirmDelete"
    >
      <!-- TODO Use `displaySectionTitle` here once #12274 is merged as that PR
        changes how we handle section indexing, which is needed for displaySectionTitle -->
      {{ deleteConfirmation$({ section_title: activeSection.section_title }) }}
    </KModal>

  </div>

</template>


<script>

  import { get } from '@vueuse/core';
  import { ref } from 'kolibri.lib.vueCompositionApi';
  import logging from 'kolibri.lib.logging';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import DragContainer from 'kolibri.coreVue.components.DragContainer';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
  import Draggable from 'kolibri.coreVue.components.Draggable';
  import AccordionItem from 'kolibri-common/components/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/AccordionContainer';
  import useAccordion from 'kolibri-common/components/useAccordion';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import commonCoach from '../../common';
  import { PageNames } from '../../../constants';
  import TabsWithOverflow from './TabsWithOverflow';
  import NotEnoughResourcesModal from './NotEnoughResourcesModal';

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
      NotEnoughResourcesModal,
    },
    mixins: [commonCoreStrings, commonCoach],
    setup() {
      const {
        sectionLabel$,
        selectAllLabel$,
        addQuizSections$,
        addSectionLabel$,
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
        changesSavedSuccessfully$,
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
        setActiveSection,
        updateQuiz,
        selectAllQuestions,
        replacementQuestionPool,
        // Computed
        toggleQuestionInSelection,
        allSections,
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

      // The number we use for the default section title
      const sectionCreationCount = ref(1);
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
        sectionCreationCount,
        sectionLabel$,
        expandAll$,
        collapseAll$,
        selectAllLabel$,
        addQuizSections$,
        quizSectionsLabel$,
        addSectionLabel$,
        addQuestionsLabel$,
        noQuestionsInSection$,
        addQuizSectionQuestionsInstructions$,
        editSectionLabel$,
        deleteSectionLabel$,
        questionDeletionConfirmation$,
        replaceAction$,
        questionList$,
        sectionDeletedNotification$,
        deleteConfirmation$,
        changesSavedSuccessfully$,
        questionsDeletedNotification$,

        toggleQuestionInSelection,
        selectAllQuestions,
        updateSection,
        allQuestionsSelected,
        selectAllIsIndeterminate,
        deleteActiveSelectedQuestions,
        addSection,
        removeSection,
        setActiveSection,
        updateQuiz,
        updateResources$,
        displaySectionTitle,

        // Computed
        allSections,
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
        return get(this.allSections).map((section, index) => {
          const id = section.section_id;
          const label = this.displaySectionTitle(section, index);
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
            // TODO Use `displaySectionTitle` here once #12274 is merged as that PR
            // changes how we handle section indexing
            this.sectionDeletedNotification$({ section_title })
          );
          this.focusActiveSectionTab();
        });
        this.handleShowConfirmation();
      },
      handleShowConfirmation(section_id = null) {
        this.showDeleteConfirmation = section_id;
      },
      handleReplaceSelection() {
        if (this.replacementQuestionPool.length < this.selectedActiveQuestions.length) {
          this.showNotEnoughResourcesModal = true;
        } else {
          const section_id = get(this.activeSection).section_id;
          const route = this.$router.getRoute(PageNames.QUIZ_REPLACE_QUESTIONS, { section_id });
          this.$router.push(route);
        }
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
          logger.error(
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
        const payload = {
          section_id: get(this.activeSection).section_id,
          questions: newArray,
        };
        this.updateSection(payload);
        this.$store.dispatch('createSnackbar', this.changesSavedSuccessfully$());
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
      deleteQuestions() {
        const count = this.selectedActiveQuestions.length;
        this.deleteActiveSelectedQuestions();
        this.$store.dispatch(
          'createSnackbar',
          this.questionsDeletedNotification$({
            count,
          })
        );
      },
      redirectToSelectResources() {
        this.showNotEnoughResourcesModal = false;
        this.openSelectResources(this.activeSection.section_id);
      },
    },
  };

</script>


<style lang="scss"  scoped>

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
