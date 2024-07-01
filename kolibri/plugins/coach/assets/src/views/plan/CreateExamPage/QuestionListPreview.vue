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
        v-else-if="!windowIsSmall && sections && sections.length"
        :hideTopActions="true"
        :items="sections"
        :style="{ backgroundColor: $themeTokens.surface }"
      >
        <AccordionItem
          v-for="(section, index) in sections"
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
            <div
              v-show="isExpanded(index)"
              :style="{
                backgroundColor: $themePalette.grey.v_100,
              }"
            >
              <ul class="question-list">
                <li v-for="(question, i) in section.questions">
                  <KButton
                    tabindex="0"
                    class="question-button"
                    appearance="basic-link"
                    :class="{ selected: isSelected(question) }"
                    :style="accordionStyleOverrides"
                    @click="handleQuestionChange(question.item)"
                  >
                    <span class="text">
                      {{ questionNumberLabel$({ questionNumber: i + 1 }) }}
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
          :style="{ fill: $themePalette.yellow.v_1100 }"
        />
        {{ resourceMissingText }}
      </p>
    </KGridItem>
  </KGrid>

</template>


<script>

  import { ref, computed, toRefs, watch } from 'kolibri.lib.vueCompositionApi';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useAccordion from 'kolibri-common/components/useAccordion';
  import AccordionItem from 'kolibri-common/components/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/AccordionContainer';
  import coreStrings from 'kolibri.utils.coreStrings';
  import {
    displayQuestionTitle,
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import AssessmentQuestionListItem from './AssessmentQuestionListItem';

  export default {
    name: 'QuestionListPreview',
    components: {
      AssessmentQuestionListItem,
      AccordionContainer,
      AccordionItem,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const { windowIsSmall } = useKResponsiveWindow();

      const { questionsLabel$, quizSectionsLabel$ } = enhancedQuizManagementStrings;
      const { questionNumberLabel$ } = coreStrings;

      const { sections, selectedExercises } = toRefs(props);

      const { expand, isExpanded, toggle } = useAccordion(sections);

      const questions = computed(() => {
        return sections.value.reduce((acc, section) => [...acc, ...section.questions], []);
      });

      const sectionQuestionIndexOffsets = sections.value.reduce(
        (acc, section) => {
          acc.push(acc[acc.length - 1] + section.questions.length);
          return acc;
        },
        [0],
      );

      const currentQuestionIndex = ref(0);

      function expandCurrentSectionIfNeeded() {
        if (!sections.value || !sections.value.length) {
          return;
        }
        let qCount = 0;
        for (let i = 0; i < sections?.value?.length; i++) {
          qCount += sections?.value[i]?.questions?.length;
          if (qCount >= currentQuestionIndex.value) {
            if (!isExpanded(i)) {
              expand(i);
            }
            break;
          }
        }
      }

      const sectionSelectOptions = computed(() => {
        return sections.value.map((section, index) => ({
          value: index,
          label: displaySectionTitle(section, index),
        }));
      });

      const currentSectionIndex = computed(() => {
        let qCount = 0;
        for (let i = 0; i <= sections.value.length; i++) {
          console.log('qcount', qCount, currentQuestionIndex.value);
          console.log(sections.value[i].questions.length);
          qCount += sections.value[i].questions.length;
          if (qCount > currentQuestionIndex.value) {
            return i;
          }
        }
        return 0;
      });

      const currentQuestion = computed(() => questions.value[currentQuestionIndex.value]);

      const content = computed(() => selectedExercises.value[currentQuestion.value.exercise_id]);

      const currentSection = computed(() => {
        return sections.value[currentSectionIndex.value];
      });

      const questionSelectOptions = computed(() => {
        return currentSection.value.questions.map((question, index) => ({
          value: question.item,
          label: questionNumberLabel$({ questionNumber: index + 1 }),
        }));
      });

      // The KSelect-shaped object for the current section
      const selectedSection = computed(() => {
        return sectionSelectOptions.value[currentSectionIndex.value];
      });

      // The KSelect-shaped object for the current question
      const selectedQuestion = computed(() => {
        return questionSelectOptions.value.find(opt => opt.value === currentQuestion.value.item);
      });

      function handleQuestionChange(item) {
        const questionIndex = questions.value.findIndex(q => q.item === item);
        if (questionIndex !== -1) {
          //expandCurrentSectionIfNeeded();
          currentQuestionIndex.value = questionIndex || 0;
          expandCurrentSectionIfNeeded();
        }
      }

      function handleSectionChange(index) {
        const questionIndex = sections.value.slice(0, index).reduce((acc, s, i) => {
          if (i < index) {
            acc += s.questions.length;
            return acc;
          } else {
            // This will always be the last iteration thanks to slice
            return acc + 1;
          }
        }, 0);
        currentQuestionIndex.value = questionIndex;
        expandCurrentSectionIfNeeded();
      }

      watch(currentQuestionIndex, () => {
        expandCurrentSectionIfNeeded();
      });

      expandCurrentSectionIfNeeded();

      return {
        content,
        questions,
        currentQuestion,

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
      sections: {
        type: Array,
        required: true,
      },
      // If set to true, question buttons will be draggable
      fixedOrder: {
        type: Boolean,
        required: true,
      },
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
      resourceMissingText() {
        return this.coreString('resourceNotFoundOnDevice');
      },
    },
    methods: {
      listKey(question) {
        return question.exercise_id + question.question_id;
      },
      numCoachContents(exerciseId) {
        // Do this to handle missing content
        return Boolean((this.selectedExercises[exerciseId] || {}).num_coach_contents);
      },
      available(exerciseId) {
        return Boolean(this.selectedExercises[exerciseId]);
      },
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

    &:hover {
      background-color: white;
    }

    &.selected {
      background-color: white;
    }
  }

</style>
