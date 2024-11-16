<template>

  <AccordionContainer
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
          class="accordion-header"
          :style="
            index === currentSectionIndex && !isExpanded(index)
              ? { border: `2px solid ${$themeTokens.primary}` }
              : {}
          "
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
            <KIcon
              class="dot"
              :icon="sectionQuestionsIcon(index)"
              :color="sectionQuestionsIconColor(index)"
            />
            <span>{{ title }}</span>
            <KIcon
              class="chevron-icon"
              :icon="isExpanded(index) ? 'chevronUp' : 'chevronRight'"
            />
          </KButton>
        </h3>
      </template>

      <template #content>
        <div
          v-if="isExpanded(index)"
          class="spacing-items"
          :style="{
            backgroundColor: $themePalette.grey.v_200,
          }"
        >
          <span
            class="divider"
            :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"
          >
          </span>

          <div
            :aria-label="jumpToQuestion$()"
            role="navigation"
          >
            <ul class="history-list">
              <li
                v-for="(question, qIndex) in section.questions"
                :key="itemRef(question.item)"
                :ref="itemRef(question.item)"
                class="list-item"
              >
                <button
                  :class="buttonClass(question.item)"
                  :disabled="question.item === questionItem"
                  class="clickable"
                  @click="$emit('goToQuestion', section.startQuestionNumber + qIndex)"
                >
                  <KIcon
                    v-if="question.missing"
                    class="dot"
                    icon="warning"
                    :color="$themePalette.yellow.v_600"
                  />
                  <KIcon
                    v-else
                    class="dot"
                    :icon="isAnswered(question) ? 'unpublishedResource' : 'unpublishedChange'"
                    :color="
                      isAnswered(question) ? $themeTokens.progress : $themeTokens.textDisabled
                    "
                  />
                  <div class="text">
                    {{ questionText(section.startQuestionNumber + qIndex + 1) }}
                  </div>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </AccordionItem>
  </AccordionContainer>

</template>


<script>

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import {
    enhancedQuizManagementStrings,
    displaySectionTitle,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import AccordionItem from 'kolibri-common/components/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/AccordionContainer';
  import isEqual from 'lodash/isEqual';
  import useAccordion from 'kolibri-common/components/useAccordion';
  import { toRefs } from '@vueuse/core';

  function isAboveContainer(element, container) {
    return element.offsetTop < container.scrollTop;
  }

  function isBelowContainer(element, container) {
    return element.offsetTop + element.offsetHeight > container.offsetHeight + container.scrollTop;
  }

  export default {
    name: 'AnswerHistory',
    components: { AccordionContainer, AccordionItem },
    setup(props) {
      const { sections } = toRefs(props);

      const { collapse, expand, isExpanded, toggle } = useAccordion(sections);

      const { jumpToQuestion$ } = enhancedQuizManagementStrings;

      const { questionNumberLabel$ } = coreStrings;

      return {
        displaySectionTitle,
        collapse,
        expand,
        isExpanded,
        toggle,
        jumpToQuestion$,
        questionNumberLabel$,
      };
    },
    props: {
      sections: {
        type: Array,
        required: true,
        validator: value => value.every(section => Boolean(section.questions)),
      },
      currentSectionIndex: {
        type: Number,
        required: true,
      },
      pastattempts: {
        type: Array,
        required: true,
      },
      questionNumber: {
        type: Number,
        required: true,
      },
      questionItem: {
        type: String,
        required: true,
      },
      // hack to get access to the scrolling pane
      wrapperComponentRefs: {
        type: Object,
        required: true,
      },
    },
    computed: {
      sectionCompletionMap() {
        const answeredAttemptItems = this.pastattempts.filter(a => a.answer).map(a => a.item);
        return this.sections.reduce((acc, { questions }, index) => {
          acc[index] = questions
            .filter(q => answeredAttemptItems.includes(q.item))
            .map(q => q.item);

          return acc;
        }, {});
      },
      accordionStyleOverrides() {
        return {
          color: this.$themeTokens.text + '!important',
          textDecoration: 'none',
        };
      },
    },
    watch: {
      currentSectionIndex(newSectionIndex, oldSectionIndex) {
        // Expand the section that contains the current question if it's closed
        if (!isEqual(newSectionIndex, newSectionIndex)) {
          this.expand(newSectionIndex);
          this.collapse(oldSectionIndex);
        }
      },
      questionNumber() {
        // If possible, scroll it into view
        const element = (this.$refs[this.itemRef(this.questionItem)] || [])[0];
        if (element && element.scrollIntoView && this.wrapperComponentRefs.questionListWrapper) {
          const container = this.wrapperComponentRefs.questionListWrapper.$el;
          if (isAboveContainer(element, container)) {
            element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
          } else if (isBelowContainer(element, container)) {
            element.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'smooth' });
          }
        }
      },
    },
    mounted() {
      // Expand the section that contains the current question on mount
      this.expand(this.currentSectionIndex);
    },
    methods: {
      sectionQuestionsIconColor(index) {
        const answered = this.sectionCompletionMap[index].length;
        const total = this.sections[index].questions.length;
        if (answered === total) {
          return this.$themeTokens.progress;
        } else if (answered > 0) {
          return this.$themeTokens.progress;
        }
        return this.$themeTokens.textDisabled;
      },
      sectionQuestionsIcon(index) {
        const answered = this.sectionCompletionMap[index].length;
        const total = this.sections[index].questions.length;
        if (answered === total) {
          return 'unpublishedResource';
        } else if (answered > 0) {
          return 'unpublishedChange';
        }
        return 'unpublishedChange';
      },
      itemRef(item) {
        return `answer-history-item-${item}`;
      },
      questionText(num) {
        return this.questionNumberLabel$({ questionNumber: num });
      },
      isAnswered(question) {
        const attempt = this.pastattempts.find(attempt => attempt.item === question.item);
        return attempt && attempt.answer;
      },
      buttonClass(item) {
        if (this.questionItem === item) {
          return this.$computedClass({
            color: this.$themeTokens.text,
            backgroundColor: this.$themeTokens.surface,
            border: `2px solid ${this.$themeTokens.primary}`,
          });
        }
        return this.$computedClass({
          backgroundColor: this.$themeTokens.surface,
          ':hover': {
            backgroundColor: this.$themePalette.grey.v_200,
          },
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .history-list {
    max-height: inherit;
    padding: 0.125em 0;
    margin: 0;
    list-style-type: none;
  }

  .list-item {
    margin: 0.5em 0;
  }

  .clickable {
    @extend %md-decelerate-func;

    position: relative;
    display: block;
    width: 100%;
    text-align: left;
    cursor: pointer;
    user-select: none;
    border: 0;
    border-radius: 4px;
    outline-offset: -2px;
    transition: background-color $core-time;
  }

  .dot {
    position: absolute;
    top: 50%;
    left: 1em;
    vertical-align: middle;
    transform: translateY(-50%);
  }

  .text {
    margin: 16px;
    margin-left: 48px;
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

  .accordion-header-label {
    display: block;
    width: calc(100% - 1em);
    height: 100%;
    padding: 1em 1em 1em 3em;
  }

  .chevron-icon {
    position: absolute;
    top: 50%;
    right: 0.5em;
    vertical-align: middle;
    transform: translateY(-50%);
  }

</style>
