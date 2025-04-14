<template>

  <div :style="{ backgroundColor: $themeTokens.surface }">
    <h3
      id="answer-history-label"
      class="header"
    >
      {{ $tr('answerHistoryLabel') }}
    </h3>

    <div v-if="isMobile">
      <KSelect
        v-if="sectionSelectOptions.length > 1"
        class="section-select"
        :value="selectedSection"
        :label="quizSectionsLabel$()"
        :options="sectionSelectOptions"
        :disabled="$attrs.disabled"
        @change="handleSectionChange($event.value)"
      />

      <h2
        v-else-if="selectedSection.label"
        class="section-select"
      >
        {{ selectedSection.label }}
      </h2>

      <KSelect
        class="history-select"
        :value="selectedQuestion"
        :label="questionsLabel$()"
        :options="questionSelectOptions"
        :disabled="$attrs.disabled"
        @change="handleQuestionChange($event.value)"
      >
        <template #display>
          <AttemptLogItem
            class="attempt-selected"
            :isSurvey="isSurvey"
            :attemptLog="selectedAttemptLog"
            :questionNumber="selectedQuestionNumber + 1"
            displayTag="span"
          />
        </template>
        <template #option="{ index }">
          <AttemptLogItem
            v-if="attemptLogsForCurrentSection[index]"
            class="attempt-option"
            :isSurvey="isSurvey"
            :attemptLog="attemptLogsForCurrentSection[index]"
            :questionNumber="index + 1"
            displayTag="span"
          />
        </template>
      </KSelect>
    </div>

    <AccordionContainer
      v-else
      :hideTopActions="true"
      :items="sections"
    >
      <AccordionItem
        v-for="(section, index) in sections"
        :id="`section-questions-${index}`"
        :key="`section-questions-${index}`"
        :title="displaySectionTitle(section, index)"
        @focus="expand(index)"
      >
        <template
          v-if="sections.length > 1"
          #heading="{ title }"
        >
          <h3
            v-if="title"
            class="accordion-header"
            :style="{
              backgroundColor: index === currentSectionIndex ? $themePalette.grey.v_200 : '',
            }"
          >
            <KButton
              tabindex="0"
              appearance="basic-link"
              :style="accordionStyleOverrides"
              class="accordion-header-label"
              :aria-expanded="isExpanded(index)"
              :aria-controls="`section-question-panel-${index}`"
              @click="toggle(index)"
            >
              <span>{{ title }}</span>
              <KIcon
                class="chevron-icon"
                :icon="isExpanded(index) ? 'chevronUp' : 'chevronRight'"
              />
            </KButton>
          </h3>
        </template>
        <template #content>
          <div v-show="sections.length === 1 || isExpanded(index)">
            <ul
              ref="attemptList"
              class="history-list"
              role="listbox"
              @keydown.home="setSelectedAttemptLog(0)"
              @keydown.end="setSelectedAttemptLog(attemptLogs.length - 1)"
              @keydown.up.prevent="setSelectedAttemptLog(previousQuestion(selectedQuestionNumber))"
              @keydown.left.prevent="
                setSelectedAttemptLog(previousQuestion(selectedQuestionNumber))
              "
              @keydown.down.prevent="setSelectedAttemptLog(nextQuestion(selectedQuestionNumber))"
              @keydown.right.prevent="setSelectedAttemptLog(nextQuestion(selectedQuestionNumber))"
            >
              <li
                v-for="(question, qIndex) in section.questions"
                :key="`attempt-item-${qIndex}`"
                class="attempt-item"
                :style="{
                  backgroundColor: isSelected(section.startQuestionNumber + qIndex)
                    ? $themePalette.grey.v_200
                    : '',
                }"
              >
                <a
                  ref="attemptListOption"
                  role="option"
                  class="attempt-item-anchor"
                  :aria-selected="isSelected(section.startQuestionNumber + qIndex).toString()"
                  :tabindex="isSelected(section.startQuestionNumber + qIndex) ? 0 : -1"
                  @click.prevent="setSelectedAttemptLog(section.startQuestionNumber + qIndex)"
                  @keydown.enter="setSelectedAttemptLog(section.startQuestionNumber + qIndex)"
                  @keydown.space.prevent="
                    setSelectedAttemptLog(section.startQuestionNumber + qIndex)
                  "
                >
                  <AttemptLogItem
                    v-if="attemptLogsBySection[index][qIndex]"
                    :isSurvey="isSurvey"
                    :attemptLog="attemptLogsBySection[index][qIndex]"
                    :questionNumber="qIndex + 1"
                    displayTag="p"
                  />
                </a>
              </li>
            </ul>
          </div>
        </template>
      </AccordionItem>
    </AccordionContainer>
  </div>

</template>


<script>

  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import useAccordion from 'kolibri-common/components/useAccordion';
  import AccordionItem from 'kolibri-common/components/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/AccordionContainer';
  import { computed, onMounted, watch } from 'vue';
  import { toRefs } from '@vueuse/core';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import AttemptLogItem from './AttemptLogItem';

  export default {
    name: 'AttemptLogList',
    components: {
      AttemptLogItem,
      AccordionContainer,
      AccordionItem,
    },
    setup(props, { emit }) {
      const { questionsLabel$, quizSectionsLabel$ } = enhancedQuizManagementStrings;
      const { questionNumberLabel$ } = coreStrings;
      const { currentSectionIndex, sections, selectedQuestionNumber } = toRefs(props);

      const { expand, isExpanded, toggle } = useAccordion(sections);

      /** Finds the section which the current attempt belongs to and expands it */
      function expandCurrentSectionIfNeeded() {
        if (!isExpanded(currentSectionIndex.value)) {
          expand(currentSectionIndex.value);
        }
      }

      const sectionSelectOptions = computed(() => {
        return sections.value.map((section, index) => ({
          value: index,
          label: displaySectionTitle(section, index),
        }));
      });

      const currentSection = computed(() => {
        return sections.value[currentSectionIndex.value];
      });

      // Computed property for the attempt logs for each section
      const attemptLogsBySection = computed(() => {
        return sections.value.map(section => {
          const start = section.startQuestionNumber;
          return props.attemptLogs.slice(start, start + section.questions.length);
        });
      });

      // For mobile view: returns attempt log for currently selected section
      const attemptLogsForCurrentSection = computed(() => {
        return attemptLogsBySection.value[currentSectionIndex.value];
      });

      const questionSelectOptions = computed(() => {
        return currentSection.value.questions.map((question, index) => ({
          value: index,
          label: questionNumberLabel$({ questionNumber: index + 1 }),
          disabled: !attemptLogsForCurrentSection.value[index],
        }));
      });

      // The KSelect-shaped object for the current section
      const selectedSection = computed(() => {
        return sectionSelectOptions.value[currentSectionIndex.value];
      });

      // The KSelect-shaped object for the current question
      const selectedQuestion = computed(() => {
        return questionSelectOptions.value[
          selectedQuestionNumber.value - currentSection.value.startQuestionNumber
        ];
      });

      // Computed property for the selected attempt log
      const selectedAttemptLog = computed(() => {
        return props.attemptLogs[selectedQuestionNumber.value];
      });

      function handleQuestionChange(index) {
        emit('select', index + currentSection.value.startQuestionNumber);
        expandCurrentSectionIfNeeded();
      }

      function handleSectionChange(index) {
        const questionIndex = sections.value[index].startQuestionNumber;
        emit('select', questionIndex);
        expandCurrentSectionIfNeeded();
      }

      watch(selectedQuestionNumber, expandCurrentSectionIfNeeded);
      onMounted(expandCurrentSectionIfNeeded);

      return {
        handleSectionChange,
        handleQuestionChange,
        displaySectionTitle,
        quizSectionsLabel$,
        questionsLabel$,
        expand,
        isExpanded,
        toggle,
        selectedSection,
        sectionSelectOptions,
        selectedQuestion,
        questionSelectOptions,
        attemptLogsForCurrentSection,
        attemptLogsBySection,
        selectedAttemptLog,
      };
    },
    props: {
      sections: {
        type: Array,
        required: true,
      },
      currentSectionIndex: {
        type: Number,
        required: true,
      },
      attemptLogs: {
        type: Array,
        required: true,
      },
      isMobile: {
        type: Boolean,
        required: false,
      },
      selectedQuestionNumber: {
        type: Number,
        required: true,
      },
      isSurvey: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      accordionStyleOverrides() {
        return {
          color: this.$themeTokens.text + '!important',
          textDecoration: 'none',
        };
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.scrollToSelectedAttemptLog(this.selectedQuestionNumber);
      });
    },
    methods: {
      setSelectedAttemptLog(questionNumber) {
        const listOption = this.$refs.attemptListOption[questionNumber];
        listOption.focus();

        this.$emit('select', questionNumber);
        this.scrollToSelectedAttemptLog(questionNumber);
      },
      isSelected(questionNumber) {
        return Number(this.selectedQuestionNumber) === questionNumber;
      },
      scrollToSelectedAttemptLog(questionNumber) {
        let selectedElement;
        if (
          this.$refs.attemptListOption &&
          this.$refs.attemptList &&
          this.$refs.attemptList.children
        ) {
          selectedElement = this.$refs.attemptList.children[questionNumber];
        }
        if (selectedElement) {
          const parent = this.$el.parentElement;
          parent.scrollTop =
            selectedElement.offsetHeight * (questionNumber + 1) - parent.offsetHeight / 2;
        }
      },
      previousQuestion(questionNumber) {
        return questionNumber - 1 >= 0 ? questionNumber - 1 : this.attemptLogs.length - 1;
      },
      nextQuestion(questionNumber) {
        return questionNumber + 1 < this.attemptLogs.length ? questionNumber + 1 : 0;
      },
    },
    $trs: {
      answerHistoryLabel: {
        message: 'Answer history',
        context:
          'Indicates a record of answers that a learner has responded to questions in a quiz, for example.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .header {
    padding-top: 10px;
    padding-bottom: 10px;
    padding-left: 16px;
    margin: 0;
  }

  .history-list {
    max-height: inherit;
    padding-right: 0;
    padding-left: 0;
    margin: 0;
    text-align: justify;
    list-style-type: none;
  }

  .section-select {
    max-width: 90%;
    padding: 0.5em 0;
    margin: 1em auto;
  }

  .history-select {
    max-width: 90%;
    padding: 0.5em 0;
    margin: 0 auto;
  }

  /deep/.ui-select-dropdown {
    left: 0;
  }

  .attempt-option {
    position: relative;
    width: calc(100% - 1em);

    /deep/.svg-item {
      position: absolute;
      top: 50%;
      right: 0.5em;
      z-index: 1;
      vertical-align: middle;
      transform: translateY(-50%);
    }
  }

  .attempt-selected {
    /deep/.svg-item {
      position: absolute;
      top: 50%;
      right: 0.5em;
      vertical-align: middle;
      transform: translateY(-50%);
    }
  }

  .attempt-item {
    display: block;
    min-width: 120px;
    clear: both;
  }

  .attempt-item-anchor {
    display: block;
    padding-right: 1vw;
    padding-left: 1vw;
    cursor: pointer;
  }

  .accordion-header-label {
    display: block;
    width: calc(100% - 1em);
    height: 100%;
    padding: 1em;

    // Removes underline from section headings
    /deep/.link-text {
      text-decoration: none;
    }
  }

  .chevron-icon {
    position: absolute;
    top: 50%;
    right: 0.5em;
    vertical-align: middle;
    transform: translateY(-50%);
  }

  .accordion-header {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0;
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
    text-align: left;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.3s ease;
  }

</style>
