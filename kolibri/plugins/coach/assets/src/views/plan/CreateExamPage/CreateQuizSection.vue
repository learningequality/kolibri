<template>

  <div>
    <KGrid
      class="add-padding"
    >
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
        />
      </KGridItem>
    </KGrid>

    <p>{{ $tr('addSectionsDescription') }}</p>

    <hr class="bottom-border">
    <br>


    <KGrid
      class="kgrid-alignment-style"
    >
      <KGridItem
        :layout12="{ span: 6 }"
        :style="noKgridItemPadding"
      >
        <KTabs
          tabsId="coachReportsTabs"
          ariaLabel="Coach reports"
          :tabs="tabs"
        >
          <template>

          </template>
        </KTabs>
      </KGridItem>

      <KGridItem
        :layout12="{ span: 6 }"
        :style="noKgridItemPadding"
      >
        <KButton
          class="float-button"
          appearance="flat-button"
          icon="plus"
        >
          {{ ($tr('addSection')).toUpperCase() }}
        </KButton>
      </KGridItem>

    </KGrid>

    <hr class="bottom-border">
    <div v-if="isQuestionAvailable">
      <KGrid>
        <KGridItem
          :layout12="{ span: 6 }"
        >
          <div class="left-column-alignment-style">
            <div class="align-kcheckbox-style">
              <p>
                <KCheckbox />
              </p>
            </div>

            <div>
              <p>{{ $tr('selectAllLabel') }}</p>
            </div>
          </div>
        </KGridItem>

        <KGridItem
          :layout12="{ span: 6 }"
        >
          <div class="right-alignment-style">
            <KGrid>
              <KGridItem :layout12="{ span: 4 }">
                <div class="icon-container">
                  <KIcon class="reduce-chervon-spacing" icon="chevronDown" />
                  <KIcon class="reduce-chervon-spacing" icon="chevronUp" />
                </div>
              </KGridItem>

              <KGridItem :layout12="{ span: 4 }">

                <KIcon
                  class="icon-size"
                  icon="refresh"
                />
              </KGridItem>

              <KGridItem :layout12="{ span: 4 }">
                <KIcon
                  class="icon-size"
                  icon="trash"
                />
              </KGridItem>
            </KGrid>
          </div>
        </KGridItem>

      </KGrid>

      <AccordionContainer
        :items="placeholderList"
      >
        <template
          #default="{ isItemExpanded, toggleItemState }"
        >
          <div
            v-for="item in placeholderList"
            :key="item.id"
          >
            <AccordionItem
              :id="item.id"
              :key="item.id"
              :items="placeholderList"
              :title="item.title"
              :expanded="isItemExpanded(item.id)"
            >
              <template
                #heading="{ title }"
                :accordionToggle="onAccordionToggle(item.id)"
              >
                <a
                  @click="toggleItemState(item.id)"
                >
                  <div class="flex-div">
                    <div class="left-column-alignment-style">
                      <DragHandle>
                        <KIconButton
                          class="drag-icon icon-size"
                          icon="dragVertical"
                        />
                      </DragHandle>
                      <div class="check-box-style">
                        <p>
                          <a
                            @click.prevent="toggleItemState(item.id)"
                          >
                            <KCheckbox />
                          </a>
                        </p>
                      </div>
                    </div>

                    <div class="occupy-remaining-space">
                      <button
                        class="remove-button-style"
                      >
                        <KGrid>
                          <KGridItem
                            :layout12="{ span: 6 }"
                          >
                            <div style="margin-top:1em;">
                              {{ title }}
                            </div>
                          </KGridItem>

                          <KGridItem
                            :layout12="{ span: 6 }"
                          >
                            <div class="right-alignment-style">
                              <KIcon
                                v-if="isItemExpanded(item.id)"
                                class="icon-size toggle-icon"
                                icon="chevronUp"
                              />
                              <KIcon
                                v-else
                                class="icon-size toggle-icon"
                                icon="chevronRight"
                              />

                            </div>
                          </KGridItem>
                        </KGrid>
                      </button>
                    </div>
                  </div>
                </a>
              </template>

              <template
                v-if="isItemExpanded(item.id)"
                #content
              >
                <div class="accordion-detail-container">
                  <KGrid>
                    <KGridItem :layout12="{ span: 8 }">
                      <p>{{ $tr('questionPhrase') }}</p>
                      <p>{{ $tr('questionSubtitle') }}</p>
                    </KGridItem>

                    <KGridItem :layout12="{ span: 4 }">
                      <KIcon class="float-item-left-style" icon="edit" />
                    </KGridItem>
                  </KGrid>

                  <div class="choose-question question">
                    <p class="space-content">
                      {{ $tr('chooseQuestionLabel') }}
                    </p>
                  </div>


                  <hr class="bottom-border">
                  <KButton
                    style="width:100%;margin-bottom:0.5em"
                    appearance="raised-button"
                    icon="plus"
                  >
                    {{ $tr('addAnswer') }}
                  </KButton>
                  <hr>
                </div>
              </template>
            </AccordionItem>
          </div>
        </template>
      </AccordionContainer>
    </div>


    <div
      v-else
      class="no-question-layout"
    >

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
      >
        {{ $tr('addQuestion') }}
      </KButton>


    </div>

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import DragHandle from 'kolibri.coreVue.components.DragHandle';
  import commonCoach from '../../common';
  import AccordionContainer from './AccordionContainer.vue';
  import AccordionItem from './AccordionItem.vue';

  export default {
    name: 'CreateQuizSection',
    components: {
      AccordionContainer,
      AccordionItem,
      DragHandle,
    },
    mixins: [commonCoreStrings, commonCoach],
    data() {
      return {
        tabs: [{ id: '', label: this.$tr('sectionLabel') }],
        isQuestionAvailable: true,
      };
    },
    computed: {
      noKgridItemPadding() {
        return {
          paddingLeft: '0em',
          paddingRight: '0em',
        };
      },
      placeholderList() {
        return [
          {
            id: 1,
            title: 'question 1',
            visible: false,
            placeholderAnswers: [
              {
                id: 1,
                option: 'bit',
              },
              {
                id: 2,
                option: 'but',
              },
              {
                id: 3,
                option: 'bite',
              },
              {
                id: 4,
                option: 'bait',
              },
              {
                id: 5,
                option: 'bet',
              },
            ],
          },
          {
            id: 2,
            title: 'question 2',
            visible: false,
            placeholderAnswers: [],
          },
          {
            id: 3,
            title: 'question 3',
            visible: false,
            placeholderAnswers: [],
          },
        ];
      },
    },
    methods: {},
    $trs: {
      sectionLabel: {
        message: 'section 1',
        context: 'Indicates the section number created',
      },
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
    },
  };

</script>


<style lang="scss"  scoped>

  .style-icon {
    width: 2.5em;
    height: 2.5em;
    margin: 1.5em;
  }

  /deep/ .ui-textbox-label {
    width: 76.5em;
  }

  .no-question-layout {
    width: auto;
    height: 16.5em;
    padding: 2.5em;
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
    padding-top: 2rem;
  }

  .no-question-style {
    font-weight: bold;
  }

  .float-button {
    float: right;
    background-color: #f5f5f5;
  }

  .bottom-border {
    border: 1px solid #dedede;
  }

  .kgrid-alignment-style {
    padding-right: 1em;
    padding-left: 0;
    margin-bottom: -1.5em;
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
    margin-top: 0.5em;
    font-size: 1em;
  }

  .accordion-detail-container {
    margin-left: 3em;
  }

  .float-item-left-style {
    float: right;
    margin-top: 1em;
    margin-right: 1em;
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

</style>
