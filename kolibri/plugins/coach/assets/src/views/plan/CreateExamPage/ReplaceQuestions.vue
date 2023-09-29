<template>

  <div>
    <h5
      class="title-style"
    >
      {{ $tr('replaceQuestionText') }}
    </h5>
    <p>{{ $tr('replaceQuestionDescription') }}</p>
    <hr class="horizontal-border">

    <!-- reusing accordion components -->
    <button
      tabindex="-1"
      aria-expanded="false"
      aria-label="toggle-button"
      class="remove-button-style"
    >
      <div
        class="flex-div"
      >
        <div
          class="left-column-alignment-style"
        >
          <div
            class="check-box-style"
          >
            <KCheckbox />
          </div>
        </div>

        <div class="occupy-remaining-space">
          <button
            class="limit-height remove-button-style"
          >
            <KGrid>
              <KGridItem
                :layout12="{ span: 6 }"
              >
                <div style="margin-top:.5em;">
                  {{ $tr('selectAll') }}
                </div>
              </KGridItem>

              <KGridItem
                :layout12="{ span: 6 }"
              >
                <div class="right-alignment-style">
                  <div class="">
                    <KIcon
                      class="icon-size toggle-icon"
                      icon="chevronDown"
                    />
                  </div>
                  <div class="">
                    <KIcon
                      class="icon-size toggle-icon"
                      icon="chevronUp"
                    />
                  </div>
                </div>
              </KGridItem>
            </KGrid>
          </button>
        </div>

      </div>
    </button>

    <AccordionContainer>
      <template
        #default="{ isItemExpanded, toggleItemState }"
      >
        <div
          v-for="(item,index) in placeholderList"
          :key="index"
        >
          <AccordionItem
            :id="item"
            :key="item.id"
            :items="placeholderList"
            title="jddjjdjd"
            :expanded="isItemExpanded(item)"
          >
            <template
              :id="item"
              #heading="{ }"
              :accordionToggle="onAccordionToggle(item)"
            >
              <button
                tabindex="-1"
                aria-expanded="false"
                aria-label="toggle-button"
                class="remove-button-style"
                @click="toggleItemState(item)"
              >
                <div
                  class="flex-div"
                >
                  <div
                    class="left-column-alignment-style"
                  >
                    <div
                      class="check-box-style"
                    >
                      <KCheckbox />
                    </div>
                  </div>

                  <div class="occupy-remaining-space">
                    <button
                      class="limit-height remove-button-style"
                    >
                      <KGrid>
                        <KGridItem
                          :layout12="{ span: 10 }"
                        >
                          <div style="margin-top:.5em;">
                            {{ $tr('questionTopic') }}
                          </div>
                        </KGridItem>

                        <KGridItem
                          :layout12="{ span: 2 }"
                        >
                          <div class="right-alignment-style">
                            <KIcon
                              v-if="isItemExpanded(item)"
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
              </button>
            </template>

            <template
              v-if="isItemExpanded(item)"
              #content
            >
              <div
                id="sect1"
                aria-labelledby="accordion1id"
              >
                <KGrid>
                  <KGridItem :layout12="{ span: 8 }">
                    <button
                      class="remove-button-style text-align-start"
                    >
                      {{ $tr('questionTitle') }}
                    </button>

                    <button
                      class="remove-button-style text-align-start text-vertical-spacing"
                    >
                      {{ $tr('shortNote') }}
                    </button>
                  </KGridItem>

                  <KGridItem
                    :layout12="{ span: 4 }"
                  >
                    <KIconButton
                      class="float-item-left-style"
                      icon="edit"
                    />
                  </KGridItem>
                </KGrid>


                <p
                  class="choose-answer-style"
                >
                  {{ $tr('chooseAnswer') }}
                </p>

                <div
                  v-for="(option,id) in placeholderOptions"
                  :key="id"
                >
                  <AccordionQuizAnswer
                    :optionValue="option.answer"
                    :optionIndex="option.index"
                    :isSelected="option.selected"
                  />
                </div>

                <hr>
              </div>
            </template>
          </AccordionItem>

        </div>
      </template>
    </AccordionContainer>

    <hr class="horizontal-border">

    <footer style="float:right">
      <KButton
        text="replace"
        :primary="true"
        style="width:160%"
      />
    </footer>

  </div>

</template>


<script>

  import AccordionContainer from './AccordionContainer.vue';
  import AccordionItem from './AccordionItem.vue';
  import AccordionQuizAnswer from './AccordionQuizAnswer.vue';

  export default {
    name: 'ReplaceQuestions',
    components: {
      AccordionContainer,
      AccordionItem,
      AccordionQuizAnswer,
    },
    data() {
      return {
        placeholderList: [2, 3, 5, 6, 7, 8, 9],
        placeholderOptions: [
          {
            index: 'A',
            answer: 'bit',
            selected: false,
          },
          {
            index: 'B',
            answer: 'bat',
            selected: false,
          },
          {
            index: 'C',
            answer: 'but',
            selected: false,
          },
          {
            index: 'D',
            answer: 'bite',
            selected: false,
          },
          {
            index: 'E',
            answer: 'bet',
            selected: false,
          },
          {
            index: 'F',
            answer: 'bait',
            selected: true,
          },
        ],
      };
    },
    $trs: {
      replaceQuestionText: {
        message: 'Replace questions',
        context: 'Title for the replace questions on the side panel',
      },
      replaceQuestionDescription: {
        message: 'Replace with questions from previously selected folders',
        context: 'Description for the replace questions title',
      },
      shortNote: {
        message: 'Short <e>, [e]</e>',
        context: 'Short description about the section question.',
      },
      chooseAnswer: {
        message: 'Choose 1 answer:',
        context: 'Directs the user to select answer from the list of available options',
      },
      selectAll: {
        message: 'Select All',
        context: 'Option for use to select all questions at once',
      },
      questionTitle: {
        message: 'Select the word that has the following vowel sound.',
        context: 'Question title in a particular section.',
      },
      questionTopic: {
        message: 'Long and Short Vowel Patterns: VCV and VCC Practice',
        context: 'Topic under which questions are set.',
      },
    },
  };

</script>


<style scoped>
  .remove-button-style {
    width: 100%;
    padding: 0;
    background-color: transparent;
    border: 0;
  }
  .flex-div {
    display: flex;
  }
  .left-column-alignment-style {
    display: inline-flex;
  }
  .check-box-style {
    margin-top: 0.5em;
    margin-left: 0.5em;
  }
  .occupy-remaining-space {
    flex-grow: 1;
  }
  .limit-height {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
  }
  .right-alignment-style {
    float: right;
    margin-top: 1em;
  }

  .horizontal-border{
    color:#DEDEDE;
  }

  .text-align-start {
    text-align: start;
  }
  .text-vertical-spacing {
    margin-top: 0.5em;
  }
  .float-item-left-style {
    float: right;
    margin-top: 1em;
  }
  .choose-answer-style{
    background-color:#FAFAFA;
    border-bottom: 1px solid #DEDEDE;
    border-top:1px solid #DEDEDE;
    padding:.5em;
  }
</style>
