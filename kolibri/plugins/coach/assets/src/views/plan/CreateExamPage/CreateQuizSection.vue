<template>

  <div class="add-padding">
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
          :label="coachString('titleLabel')"
          :autofocus="true"
          :maxlength="100"
          @blur="e => quizForge.updateQuiz({ title: e.target.value })"
        />
      </KGridItem>
    </KGrid>

    <p style="margin-top: 0px;">
      {{ $tr('addSectionsDescription') }}
    </p>

    <hr class="bottom-border">

    <KGrid>
      <KGridItem
        :layout12="{ span: 10 }"
        :style="noKgridItemPadding"
      >
        <TabsWithOverflow
          tabsId="quizSectionTabs"
          :tabs="tabs"
          :appearanceOverrides="{ padding: '0px', overflow: 'hidden' }"
          :activeTabId="quizForge.activeSection && quizForge.activeSection.value.section_id"
          backgroundColor="transparent"
          hoverBackgroundColor="transparent"
        >
          <template #tab="{ tab }">
            <KButton
              appearance="flat-button"
              style="display: inline-block;"
              :appearanceOverrides="tabStyles"
              @click="() => quizForge.setActiveSection(tab.id)"
            >
              {{ tab.label }}
            </KButton>
            <KIconButton
              icon="optionsVertical"
              class="options-button"
              size="small"
              @click="() => null"
            >
              <template #menu>
                <KDropdownMenu
                  :primary="false"
                  :disabled="false"
                  :hasIcons="true"
                  :options="sectionOptions"
                  @select="opt => handleSectionOptionSelect(opt, tab.id)"
                />
              </template>
            </KIconButton>
          </template>

          <template #overflow="{ overflowTabs }">
            <KIconButton
              v-if="overflowTabs.length"
              icon="optionsHorizontal"
              :style="overflowButtonStyles(overflowTabs)"
            >
              <template #menu>
                <KDropdownMenu
                  :primary="false"
                  :disabled="false"
                  :hasIcons="true"
                  :options="overflowTabs"
                  @select="opt => quizForge.setActiveSection(opt.id)"
                >
                  <template #option="{ option }">
                    <!-- TODO Clean this up by moving it to another component -->
                    <!-- Maybe not so easy since they're styled differently -->
                    <KButton
                      appearance="flat-button"
                      :primary="quizForge.activeSection.value.section_id === option.id"
                      :appearanceOverrides="tabStyles"
                      class="menu-button"
                      @click="() => quizForge.setActiveSection(option.id)"
                    >
                      {{ option.label }}
                    </KButton>
                    <KIconButton
                      icon="optionsVertical"
                      style="position: absolute; right: 0; border-radius: 0!important;"
                      @click="() => null"
                    >
                      <template #menu>
                        <KDropdownMenu
                          :primary="false"
                          :disabled="false"
                          :hasIcons="true"
                          :containFocus="false"
                          :options="sectionOptions"
                          @select="opt => handleSectionOptionSelect(opt, option.id)"
                        />
                      </template>
                    </KIconButton>
                  </template>
                </KDropdownMenu>
              </template>
            </KIconButton>
          </template>
        </TabsWithOverflow>
      </KGridItem>

      <KGridItem
        :layout12="{ span: 2 }"
        :style="noKgridItemPadding"
      >
        <KButton
          appearance="flat-button"
          icon="plus"
          @click="handleAddSection"
        >
          {{ ($tr('addSection')).toUpperCase() }}
        </KButton>
      </KGridItem>

    </KGrid>

    <hr class="bottom-border">

    <KTabsPanel
      class="no-question-layout"
      tabsId="quizSectionTabs"
      :activeTabId="quizForge.activeSection.value.section_id"
    >

      <p>{{ quizForge.activeSection.value.section_id }}</p>
      <!-- TODO This should be a separate component like "empty section container" or something -->
      <div class="question-mark-layout">
        <span class="help-icon-style">?</span>
      </div>

      <p class="no-question-style">
        {{ $tr('noQuestionsLabel') }}
      </p>

      <p>{{ $tr('selectResourceGuide') }}</p>

      <KButton
        primary
        icon="plus"
        @click="openSelectResources(quizForge.activeSection.value.section_id)"
      >
        {{ $tr('addQuestion') }}
      </KButton>
      <!-- END TODO -->


    </KTabsPanel>

  </div>

</template>


<script>

  import { get } from '@vueuse/core';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import TabsWithOverflow from './TabsWithOverflow.vue';

  /*
    import DragHandle from 'kolibri.coreVue.components.DragHandle';
    import Draggable from 'kolibri.coreVue.components.Draggable';
    import DragContainer from 'kolibri.coreVue.components.DragContainer';
    import DragSortWidget from 'kolibri.coreVue.components.DragSortWidget';
    import AccordionContainer from './AccordionContainer.vue';
    import AccordionItem from './AccordionItem.vue';
    */
  export default {
    name: 'CreateQuizSection',
    components: {
      TabsWithOverflow,
      /*
        AccordionContainer,
        AccordionItem,
        DragHandle,
        Draggable,
        DragContainer,
        DragSortWidget,
        */
    },
    mixins: [commonCoreStrings, commonCoach],
    inject: ['quizForge'],
    computed: {
      noKgridItemPadding() {
        return {
          paddingLeft: '0em',
          paddingRight: '0em',
        };
      },
      tabs() {
        return get(this.quizForge.allSections).map((section, index) => {
          const id = section.section_id;
          // TODO The "Section N" label should probably be set directly on the Section object
          // at creation rather than this
          const label = section.section_title
            ? section.section_title
            : `Section asdfjla askjljf lasjdfkj aslf${index + 1}`;

          return { id, label };
        });
      },
      tabStyles() {
        return {
          margin: '0px',
          textOverflow: 'ellipsis',
          maxWidth: '160px',
        };
      },
      sectionOptions() {
        return [
          {
            // TODO This should be a $tr
            label: 'Edit',
            icon: 'edit',
          },
          {
            // TODO This should be a $tr
            label: 'Delete',
            icon: 'delete',
          },
        ];
      },
    },
    methods: {
      activeSectionIsHidden(overflow) {
        const ids = overflow.map(i => i.id);
        return ids.includes(get(this.quizForge.activeSection).section_id);
      },
      overflowButtonStyles(overflow) {
        return {
          height: '40px',
          width: '40px',
          border: this.activeSectionIsHidden(overflow)
            ? '2px solid ' + this.$themeTokens.primary
            : 'none',
        };
      },
      handleAddSection() {
        const newSection = this.quizForge.addSection();
        this.quizForge.setActiveSection(get(newSection).section_id);
      },
      handleSectionOptionSelect({ label }, section_id) {
        switch (label) {
          case 'Edit':
            this.$router.replace({ path: 'new/' + section_id + '/edit' });
            break;
          case 'Delete':
            this.quizForge.removeSection(section_id);
            break;
        }
      },
      openSelectResources(section_id) {
        this.$router.replace({ path: 'new/' + section_id + '/select-resources' });
      },
      /*
        handleOrderChange(event) {
          const reorderedList = event.newArray.map(x => {
            if (x.isPlaceholder) {
              return this.placeholderList.find(item => item.id === x.id);
            }
            return x;
          });
          this.placeholderList = reorderedList;
          localStorage.setItem('reorderedList', JSON.stringify(reorderedList));
          this.$store.dispatch('createSnackbar', this.$tr('successNotification'));
        },
        shiftOne(index, delta) {
          const newArray = [...this.placeholderList];
          const adjacentItem = newArray[index + delta];
          newArray[index + delta] = newArray[index];
          newArray[index] = adjacentItem;

          this.handleOrderChange({ newArray });
        },
            */
    },
    $trs: {
      addSection: {
        message: 'add section',
        context: 'Label for adding the number of quiz sections',
      },
      noQuestionsLabel: {
        message: 'There are no questions in this section',
        context: 'Indicates that there is no question in the particular section',
      },
      selectResourceGuide: {
        message: 'To add questions, select resources from the available channels.',
        context: 'Explains a way of adding a question',
      },
      addQuestion: {
        message: 'Add Questions',
        context: 'Button label for adding a new question',
      },
      addSectionsDescription: {
        message: 'Add one or more sections to your quiz, according to your needs',
        context:
          'This message indicates that more than one section can be added when creating a quiz.',
      },
      /*
        questionPhrase: {
          message: 'Select the word that has the following vowel sound.',
          context: 'Placholder for the question',
        },
        questionSubtitle: {
          message: ' Short <e>, [e]</e>',
          context: 'Placholder content for the question description',
        },
        chooseQuestionLabel: {
          message: 'Choose 1 answer:',
          context: 'Label to indicate the question to be chosen',
        },
        addAnswer: {
          message: 'Add answer',
          context: 'Button text to indicate that more answers can be added to the question.',
        },
        selectAllLabel: {
          message: 'Select all',
          context: 'Label indicates that all available options can be chosen at once.',
        },
        upLabel: {
          message: 'Move {name} up one',
          context: 'Label to rearrange question order. Not seen on UI.',
        },
        downLabel: {
          message: 'Move {name} down one',
          context: 'Label to rearrange question order. Not seen on UI.',
        },
        checkBoxLabel: {
          message: 'Select {name} question"',
          context: 'Checkbox to select the question',
        },
        successNotification: {
          message: 'Question order saved',
          context: 'Success message shown when the admin re-orders question',
        },
          */
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

  .add-padding {
    padding-top: 16px;
  }

  .no-question-style {
    font-weight: bold;
  }

  .bottom-border {
    margin-block-start: -2px;
    border: 1px solid #dedede;
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

  .right-alignment-style {
    float: right;
    margin-top: 1em;
  }

  .drag-icon {
    margin-top: -0.5em;
    font-size: 1em;
  }

  .accordion-detail-container {
    margin-left: 3em;
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

  .align-kcheckbox-style {
    margin-left: 3em;
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
    width: 36px !important;
    height: 36px !important;
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

</style>
