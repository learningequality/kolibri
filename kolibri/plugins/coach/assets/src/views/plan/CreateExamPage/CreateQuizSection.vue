<template>

  <div>
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
        />
      </KGridItem>
    </KGrid>

    <p>{{ $tr('addSectionsDescription') }}</p>

    <hr class="bottom-border">
    <br>

    <KGrid>
      <KGridItem
        :layout12="{ span: 8 }"
      >
        <KTabs
          tabsId="coachReportsTabs"
          ariaLabel="Coach reports"
          :tabs="tabs"
          class="active-section"
        >
          <template>
          </template>
        </KTabs>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 4 }"
      >
        <KButton
          class="add-section-button"
          appearance="flat-button"
          icon="plus"
        >
          {{ ($tr('addSection')).toUpperCase() }}
        </KButton>
      </KGridItem>
    </KGrid>

    <hr class="bottom-border">

    <div v-if="isQuestionAvailable">
      <KGrid
        class="question-row"
      >
        <KGridItem
          :layout12="{ span: 6 }"
        >
          <div class="left-column-alignment-style">
            <div>
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
          #default="{ isItemExpanded, toggleItemState, isOptionSelected, isAnswerSelected }"
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
              @click="toggleItemID(item.id)"
            >
              <template
                #heading="{ title }"
                :accordionToggle="onAccordionToggle(item.id)"
              >
                <KGrid class="question-row">
                  <KGridItem :layout12="{ span: 6 }">
                    <div class="left-column-alignment-style">
                      <DragHandle>
                        <!-- FIXME: Needs vertically centered -->
                        <KIcon
                          class="drag-icon icon-size"
                          icon="dragVertical"
                        />
                      </DragHandle>

                      <div>
                        <p>
                          <KCheckbox />
                        </p>
                      </div>

                      <div>
                        <p>
                          {{ title }}
                        </p>
                      </div>
                    </div>
                  </KGridItem>

                  <KGridItem :layout12="{ span: 6 }">
                    <div class="right-alignment-style">
                      <KIconButton
                        v-if="isItemExpanded(item.id)"
                        class="icon-size"
                        icon="chevronUp"
                        @click="toggleItemState(item.id)"
                      />

                      <KIconButton
                        v-else
                        class="icon-size"
                        icon="chevronRight"
                        @click="toggleItemState(item.id)"
                      />
                    </div>
                  </KGridItem>
                </KGrid>
              </template>

              <template
                v-if="isItemExpanded(item.id)"
                #content=""
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

                  <div class="question">
                    <AnswerOption
                      v-for="answer in item.placeholderAnswers"
                      :key="answer.id"
                      :optionId="answer.id"
                      :isOptionSelected="isOptionSelected"
                      :isAnswerSelected="isAnswerSelected(answer.id)"
                    >
                      <template
                        #optionId
                      >
                        <div>
                          {{ answer.id }}
                        </div>
                      </template>
                      <template
                        #answerSection
                      >
                        <div>
                          {{ answer.option }}
                        </div>
                      </template>
                    </AnswerOption>
                  </div>

                  <hr class="bottom-border">
                  <KButton
                    style="width:100%;margin-bottom:10px"
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

      <p
        class="no-question-style"
      >
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
  import AnswerOption from './AnswerOption.vue';

  export default {
    name: 'CreateQuizSection',
    components: {
      AccordionContainer,
      AccordionItem,
      DragHandle,
      AnswerOption,
    },
    mixins: [commonCoreStrings, commonCoach],
    data() {
      return {
        isQuestionAvailable: false,
        tabs: [{ id: '', label: this.$tr('sectionLabel') }],
      };
    },
    computed: {
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
    methods: {
      onAccordionToggle(index) {
        this.placeholderList[index].visible = !this.placeholderList[index].visible;
      },
      toggleItemID(id) {
        console.log(id);
      },
    },

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
    width: 30px;
    height: 30px;
    margin: 20px;
  }

  /deep/ .ui-textbox-label {
    width: 1400px;
  }

  .bottom-border {
    margin-bottom: 10px;
    line-height: 1.2;
    color: #dedede;
  }

  .no-question-layout {
    gap: 40px;
    width: 952px;
    height: 265px;
    padding: 40px;
    text-align: center;
    background-color: #fafafa;
    border: 1px;
    border-radius: 10px;
  }

  .question-mark-layout {
    align-items: center;
    width: 40px;
    height: 40px;
    margin: auto;
    background-color: #dbc3d4;
  }

  .help-icon-style {
    font-size: 24px;
    font-weight: 700;
    line-height: 34px;
    color: #996189;
  }

  .active-section {
    margin-bottom: -25px;
    margin-left: -10px;
    color: #996189;
  }

  .add-section-button {
    float: right;
    margin-bottom: -10px;
    background-color: #f5f5f5;
  }

  .text-box-style {
    width: 1000px;
    padding: 15px;
  }

  .question-label {
    margin-top: 10px;
  }

  .icon-size {
    width: 24px;
    height: 24px;
  }

  .question-row {
    background-color: #fafafa;
    border-top: 2px solid #fafafa;
    border-bottom: 2px solid #fafafa;
  }

  .left-column-alignment-style {
    display: inline-flex;
    margin-left: 35px;
  }

  .right-alignment-style {
    float: right;
    margin-top: 10px;
  }

  .drag-icon {
    margin-top: 14px;
  }

  .accordion-detail-container {
    margin-left: 35px;
  }

  .float-item-left-style {
    float: right;
    margin-top: 10px;
    margin-right: 10px;
  }

  .reduce-chervon-spacing {
    padding: 0;
    margin: 0;
    font-size: 16px;
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
    margin: 8px;
    font-size: 14px;
    font-weight: 700;
  }

</style>
