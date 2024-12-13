<template>

  <div class="wrapper">
    <h1 class="section-header">
      {{
        replaceQuestions$({
          sectionTitle: displaySectionTitle(activeSection, activeSectionIndex),
        })
      }}
    </h1>
    <p>{{ replaceQuestionsHeading$() }}</p>
    <span
      class="divider"
      :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"
    >
    </span>
    <AccordionContainer :items="replacementQuestionPool">
      <template #left-actions>
        <KCheckbox
          ref="selectAllCheckbox"
          class="select-all-box"
          :label="selectAllLabel$()"
          :checked="selectAllIsChecked"
          :indeterminate="selectAllIsIndeterminate"
          @change="selectAllReplacementQuestions"
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
      </template>
      <AccordionItem
        v-for="(question, index) in replacementQuestionPool"
        :id="`replacement-question-${question.item}`"
        :key="`replacement-question-${question.item}`"
        :title="displayQuestionTitle(question, activeResourceMap[question.exercise_id].title)"
        :aria-selected="
          replacements.length && replacements.length === selectedActiveQuestions.length
        "
      >
        <template #heading="{ title }">
          <h3 class="accordion-header">
            <KCheckbox
              class="accordion-checkbox"
              :checked="replacements.map(r => r.item).includes(question.item)"
              @change="() => toggleInReplacements(question)"
            />
            <KButton
              tabindex="0"
              appearance="basic-link"
              :style="accordionStyleOverrides"
              class="accordion-header-label"
              :aria-expanded="isExpanded(question.item)"
              :aria-controls="`question-panel-${question.item}`"
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
          <div
            v-if="isExpanded(index)"
            :id="`question-panel-${question.item}`"
            :ref="`question-panel-${question.item}`"
            :style="{ userSelect: dragActive ? 'none!important' : 'text' }"
          >
            <ContentRenderer
              :ref="`contentRenderer-${question.item}`"
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
    </AccordionContainer>

    <div class="bottom-navigation">
      <div>
        {{ replaceSelectedQuestionsString }}
      </div>
      <KButton
        :primary="true"
        :text="replaceAction$()"
        :disabled="!canProceedToReplace"
        @click="confirmReplacement"
      />
    </div>
    <KModal
      v-if="showReplacementConfirmation"
      :submitText="coreString('confirmAction')"
      :cancelText="coreString('cancelAction')"
      :title="
        replaceQuestions$({
          sectionTitle: displaySectionTitle(activeSection, activeSectionIndex),
        })
      "
      @cancel="showReplacementConfirmation = false"
      @submit="submitReplacement"
    >
      <div>{{ replaceQuestionsExplaination$() }}</div>
      <div style="font-weight: bold">
        {{ noUndoWarning$() }}
      </div>
    </KModal>
    <KModal
      v-if="showCloseConfirmation"
      :submitText="coreString('continueAction')"
      :cancelText="coreString('cancelAction')"
      :title="closeConfirmationTitle$()"
      @cancel="showCloseConfirmation = false"
      @submit="handleConfirmClose"
    >
      {{ closeConfirmationMessage$() }}
    </KModal>
  </div>

</template>


<script>

  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
    displayQuestionTitle,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { getCurrentInstance, computed, ref } from 'vue';
  import { get } from '@vueuse/core';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import AccordionItem from 'kolibri-common/components/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/AccordionContainer';
  import useAccordion from 'kolibri-common/components/useAccordion';
  import useSnackbar from 'kolibri/composables/useSnackbar';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import { PageNames } from '../../../constants/index';

  export default {
    name: 'ReplaceQuestions',
    components: {
      AccordionContainer,
      AccordionItem,
    },
    mixins: [commonCoreStrings],
    setup(_, context) {
      const { createSnackbar } = useSnackbar();

      const router = getCurrentInstance().proxy.$router;

      const {
        replaceQuestions$,
        replaceAction$,
        selectAllLabel$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        replaceQuestionsExplaination$,
        replaceQuestionsHeading$,
        numberOfSelectedReplacements$,
        numberOfQuestionsReplaced$,
        noUndoWarning$,
        selectQuestionsToContinue$,
        collapseAll$,
        expandAll$,
      } = enhancedQuizManagementStrings;

      const {
        // Computed
        activeSection,
        activeSectionIndex,
        selectedActiveQuestions,
        activeResourceMap,
        replacementQuestionPool,
        clearSelectedQuestions,
        handleReplacement,
      } = injectQuizCreation();

      const showCloseConfirmation = ref(false);
      const showReplacementConfirmation = ref(false);
      const replacements = ref([]);

      function handleConfirmClose() {
        replacements.value = [];
        context.emit('closePanel');
      }

      function submitReplacement() {
        const count = replacements.value.length;
        handleReplacement(replacements.value);
        clearSelectedQuestions();
        router.replace({
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: this.$route.params.classId,
            quizId: this.$route.params.quizId,
            sectionIndex: this.$route.params.sectionIndex,
          },
        });
        createSnackbar(numberOfQuestionsReplaced$({ count }));
      }

      function confirmReplacement() {
        showReplacementConfirmation.value = true;
      }

      function toggleInReplacements(question) {
        const replacementIds = replacements.value.map(q => q.item);
        if (replacementIds.includes(question.item)) {
          replacements.value = replacements.value.filter(q => q.item !== question.item);
        } else {
          replacements.value.push(question);
        }
      }

      const selectAllIsIndeterminate = computed(() => {
        return (
          replacements.value.length > 0 &&
          replacements.value.length !== replacementQuestionPool.value.length
        );
      });

      const selectAllIsChecked = computed(() => {
        return (
          replacements.value && replacements.value.length === replacementQuestionPool.value.length
        );
      });

      function selectAllReplacementQuestions() {
        if (replacements.value.length === replacementQuestionPool.value.length) {
          replacements.value = [];
        } else {
          replacements.value = replacementQuestionPool.value;
        }
      }

      const { toggle, isExpanded, collapseAll, expandAll, canCollapseAll, canExpandAll } =
        useAccordion(replacementQuestionPool);

      return {
        toggle,
        isExpanded,
        collapseAll,
        expandAll,
        canCollapseAll,
        canExpandAll,

        toggleInReplacements,
        activeSection,
        activeSectionIndex,
        selectAllReplacementQuestions,
        selectedActiveQuestions,
        replacementQuestionPool,
        selectAllIsIndeterminate,
        selectAllIsChecked,
        activeResourceMap,
        showCloseConfirmation,
        showReplacementConfirmation,
        confirmReplacement,

        handleConfirmClose,
        submitReplacement,
        replacements,
        replaceQuestions$,
        replaceAction$,
        selectAllLabel$,
        numberOfSelectedReplacements$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        noUndoWarning$,
        replaceQuestionsExplaination$,
        replaceQuestionsHeading$,
        selectQuestionsToContinue$,
        collapseAll$,
        expandAll$,
        displayQuestionTitle,
        displaySectionTitle,
      };
    },
    computed: {
      accordionStyleOverrides() {
        return {
          color: this.$themeTokens.text + '!important',
          textDecoration: 'none',
          // Ensure text doesn't get highlighted as we drag
          userSelect: get(this.dragActive) ? 'none!important' : 'text',
        };
      },
      /**
      If we don't have replacement.length then there are no changes to prompt about.
      But if there are we only show if the number of replacements is the same as the number
      of selected questions to be replaced
    */
      canProceedToReplace() {
        return (
          this.replacements.length &&
          this.replacements.length === this.selectedActiveQuestions.length
        );
      },
      replaceSelectedQuestionsString() {
        const unreplacedCount = this.selectedActiveQuestions.length - this.replacements.length;
        if (unreplacedCount === 0) {
          return this.numberOfSelectedReplacements$({
            count: this.replacements.length,
            total: this.selectedActiveQuestions.length,
          });
        } else {
          return this.selectQuestionsToContinue$({
            count: this.selectedActiveQuestions.length,
          });
        }
      },
    },
    beforeRouteLeave(_, __, next) {
      if (
        !this.showCloseConfirmation && // We aren't here because the user confirmed closing
        !this.showReplacementConfirmation && // And they haven't confirmed replacing either
        this.replacements.length > 0 // And there are changes to prompt about
      ) {
        // We show the confirmation to close and lose changes
        this.showCloseConfirmation = true;
        next(false);
      } else {
        next();
      }
    },
  };

</script>


<style lang="scss" scoped>

  .accordion-header {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0;
    margin: 0;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
    text-align: left;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.3s ease;

    .chevron-icon {
      position: absolute;
      top: 0.625em;
      right: 1em;
    }
  }

  .accordion-header-label {
    display: block;
    width: 100%;
  }

  .wrapper {
    // Accounts for height of .bottom-navigation
    padding-bottom: 6em;
  }

  .bottom-navigation {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 1em;
    line-height: 2.5em;
    text-align: center;
    background-color: white;
    border-top: 1px solid black;
  }

  .accordion-checkbox {
    margin-bottom: 0;
    margin-left: 1em;
  }

  .select-all-box {
    margin-left: 1em;
  }

</style>
