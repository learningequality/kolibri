<template>

  <KGrid>
    <!-- Question list - side panel accordion unless mobile, then KSelects -->
    <KGridItem
      :layout8="{ span: windowIsSmall ? 8 : 4 }"
      :layout12="{ span: windowIsSmall ? 12 : 5 }"
      class="list-wrapper"
    >
      <div v-if="windowIsSmall">
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
      </div>

      <KSelect
        v-if="windowIsSmall"
        class="history-select"
        :value="selectedQuestion"
        :label="questionsLabel$()"
        :options="questionSelectOptions"
        :disabled="$attrs.disabled"
        @change="handleQuestionChange($event.value)"
      >
        <template #display>
          {{ selectedQuestion.label }}
        </template>
        <template #option="{ index }">
          {{ questionSelectOptions[index].label }}
        </template>
      </KSelect>

      <AccordionContainer
        v-else-if="!windowIsSmall && annotatedSections && annotatedSections.length"
        :hideTopActions="true"
        :items="annotatedSections"
        :style="{ backgroundColor: $themeTokens.surface }"
      >
        <AccordionItem
          v-for="(section, index) in annotatedSections"
          :id="`section-questions-${index}`"
          :key="`section-questions-${index}`"
          :title="displaySectionTitle(section, index)"
          @focus="expand(index)"
        >
          <template #heading="{ title }">
            <h3
              v-if="title"
              class="accordion-header"
            >
              <KButton
                tabindex="0"
                :style="accordionStyleOverrides"
                appearance="basic-link"
                class="accordion-header-label"
                :aria-expanded="isExpanded(index)"
                :aria-controls="`section-question-panel-${index}`"
                @click="toggle(index)"
              >
                <span>{{ displaySectionTitle(section, index) }}</span>
                <KIcon
                  class="chevron-icon"
                  :icon="isExpanded(index) ? 'chevronUp' : 'chevronRight'"
                />
              </KButton>
            </h3>
          </template>
          <template #content>
            <div v-show="isExpanded(index)">
              <ul class="question-list">
                <li
                  v-for="(question, i) in section.questions"
                  :key="`question-list-${i}`"
                >
                  <KButton
                    tabindex="0"
                    class="question-button"
                    appearance="basic-link"
                    :class="[listItemClass, isSelected(question) ? selectedListItemClass : '']"
                    :style="accordionStyleOverrides"
                    @click="handleQuestionChange(i, index)"
                  >
                    <span class="text">
                      {{
                        questionNumberLabel$({
                          questionNumber: i + 1 + section.startQuestionNumber,
                        })
                      }}
                    </span>
                  </KButton>
                </li>
              </ul>
            </div>
          </template>
        </AccordionItem>
      </AccordionContainer>
    </KGridItem>

    <KGridItem
      :layout8="{ span: windowIsSmall ? 8 : 4 }"
      :layout12="{ span: windowIsSmall ? 12 : 7 }"
    >
      <h3
        v-if="content && content.available"
        class="question-title"
      >
        {{ displayQuestionTitle(currentQuestion, content.title) }}
      </h3>
      <ContentRenderer
        v-if="content && content.available && currentQuestion.question_id"
        ref="contentRenderer"
        :kind="content.kind"
        :files="content.files"
        :available="content.available"
        :extraFields="content.extra_fields"
        :itemId="currentQuestion.question_id"
        :assessment="true"
        :allowHints="false"
        :showCorrectAnswer="false"
        :interactive="false"
      />
      <p v-else>
        <KIcon
          icon="warning"
          :style="{ fill: $themePalette.yellow.v_600 }"
        />
        {{ resourceMissingText }}
      </p>
    </KGridItem>
  </KGrid>

</template>


<script>

  import { ref, computed, toRefs, watch } from 'vue';
  import commonCoreStrings, { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import useAccordion from 'kolibri-common/components/useAccordion';
  import AccordionItem from 'kolibri-common/components/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/AccordionContainer';
  import { annotateSections } from 'kolibri-common/quizzes/utils';
  import {
    displayQuestionTitle,
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    name: 'QuestionListPreview',
    components: {
      AccordionContainer,
      AccordionItem,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const { windowIsSmall } = useKResponsiveWindow();

      const { questionsLabel$, quizSectionsLabel$ } = enhancedQuizManagementStrings;
      const { questionNumberLabel$ } = coreStrings;

      const { sections, selectedExercises } = toRefs(props);

      const annotatedSections = computed(() => annotateSections(sections.value));

      const { expand, isExpanded, toggle } = useAccordion(annotatedSections);

      const questions = computed(() => {
        return annotatedSections.value.reduce((acc, section) => [...acc, ...section.questions], []);
      });

      const currentQuestionIndex = ref(0);

      const currentSectionIndex = computed(() => {
        const idx = annotatedSections.value.findIndex(
          section =>
            section.startQuestionNumber <= currentQuestionIndex.value &&
            section.endQuestionNumber >= currentQuestionIndex.value,
        );
        return idx === -1 ? 0 : idx;
      });

      const currentQuestion = computed(() => {
        return questions.value[currentQuestionIndex.value];
      });

      /** Finds the section which the current attempt belongs to and expands it */
      function expandCurrentSectionIfNeeded() {
        if (!isExpanded(currentSectionIndex.value)) {
          expand(currentSectionIndex.value);
        }
      }

      const sectionSelectOptions = computed(() => {
        return annotatedSections.value.map((section, index) => ({
          value: index,
          label: displaySectionTitle(section, index),
        }));
      });

      const currentSection = computed(() => {
        return annotatedSections.value[currentSectionIndex.value];
      });

      const questionSelectOptions = computed(() => {
        return currentSection.value.questions.map((question, index) => ({
          value: index,
          label: questionNumberLabel$({
            questionNumber: index + 1 + currentSection.value.startQuestionNumber,
          }),
        }));
      });

      // The KSelect-shaped object for the current section
      const selectedSection = computed(() => {
        return sectionSelectOptions.value[currentSectionIndex.value];
      });

      // The KSelect-shaped object for the current question
      const selectedQuestion = computed(() => {
        return questionSelectOptions.value[
          currentQuestionIndex.value - currentSection.value.startQuestionNumber
        ];
      });

      function handleQuestionChange(questionIndex, sectionIndex = null) {
        if (sectionIndex === null) {
          // We're not in an accordion (ie, we only need to know the question index) as we're
          // relying on `currentSection` to determine the section
          currentQuestionIndex.value = questionIndex + currentSection.value.startQuestionNumber;
        } else {
          // otherwise, we're being given the specific section in which the question lives
          currentQuestionIndex.value =
            questionIndex + annotatedSections.value[sectionIndex].startQuestionNumber;
        }
        expandCurrentSectionIfNeeded();
      }

      function handleSectionChange(index) {
        const questionIndex = annotatedSections.value[index].startQuestionNumber;
        currentQuestionIndex.value = questionIndex;
        expandCurrentSectionIfNeeded();
      }

      const content = computed(() => {
        if (!currentQuestion.value) {
          return {};
        }
        return selectedExercises.value[currentQuestion.value.exercise_id];
      });

      watch(currentQuestionIndex, expandCurrentSectionIfNeeded);

      expandCurrentSectionIfNeeded();

      return {
        content,
        currentQuestion,
        annotatedSections,

        questionSelectOptions,
        sectionSelectOptions,
        selectedQuestion,
        selectedSection,

        handleSectionChange,
        handleQuestionChange,

        displayQuestionTitle,
        displaySectionTitle,
        quizSectionsLabel$,
        questionsLabel$,
        questionNumberLabel$,

        windowIsSmall,

        expand,
        isExpanded,
        toggle,
      };
    },
    props: {
      // `sections` is used in `setup`
      // eslint-disable-next-line vue/no-unused-properties
      sections: {
        type: Array,
        required: true,
      },
      // `selectedExercises` is used in `setup`
      // eslint-disable-next-line vue/no-unused-properties
      selectedExercises: {
        type: Object,
        required: true,
      },
    },
    computed: {
      accordionStyleOverrides() {
        return {
          color: this.$themeTokens.text + '!important',
          textDecoration: 'none',
        };
      },
      listItemClass() {
        return this.$computedClass({
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_100,
          },
        });
      },
      selectedListItemClass() {
        return this.$computedClass({
          backgroundColor: this.$themePalette.grey.v_100,
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_200,
          },
        });
      },
      resourceMissingText() {
        return this.coreString('resourceNotFoundOnDevice');
      },
    },
    methods: {
      isSelected(question) {
        return (
          this.currentQuestion.question_id === question.question_id &&
          this.currentQuestion.exercise_id === question.exercise_id
        );
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .list-wrapper {
    position: relative;
  }

  .question-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .question-title {
    margin-top: 8px;
    text-align: center;
  }

  .list-labels {
    position: absolute;
    top: 0;
    left: 0;
    margin-top: 0;
    font-weight: bold;

    li {
      padding: 8px;
    }
  }

  .fade-numbers-enter-active {
    transition: opacity $core-time;
  }

  .fade-numbers-enter {
    opacity: 0;
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

  .question-button {
    width: 100%;
    height: 100%;
    padding: 0.5em;
  }

</style>
