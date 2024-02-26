<template>

  <div>
    <h1 class="section-header" :style="{ color: `${$themeTokens.annotation}` }">
      {{ activeSection.section_title }}
    </h1>
    <span
      class="divider"
      :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"
    >
    </span>
    <h1 class="section-header">
      {{ replaceQuestions$() }}
    </h1>
    <p>{{ replaceQuestionsExplaination$() }}</p>
    <span
      class="divider"
      :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"
    >
    </span>
    <AccordionContainer
      :items="replacementQuestionPool.map(i => ({
        id: i.question_id,
      }))"
    >
      <template #left-actions>
        <KCheckbox
          ref="selectAllCheckbox"
          class="select-all-box"
          :label="selectAllLabel$()"
          :checked="replacements.length && replacements.length === selectedActiveQuestions.length"
          :indeterminate="selectAllIsIndeterminate"
          @change="() => selectAllQuestions()"
        />
      </template>
      <template #default="{ toggleItemState, isItemExpanded }">
        <AccordionItem
          v-for="(question, index) in replacementQuestionPool"
          :id="question.question_id"
          :key="index"
          :title="question.title"
        >
          <template #heading="{ title }">
            <h3
              class="accordion-header"
            >
              <KCheckbox
                style="padding-left: 0.5em"
                :checked="replacements.map(q => q.id).includes(
                  question.question_id
                )"
                @change="() => toggleInReplacements(question)"
              />
              <KButton
                tabindex="0"
                appearance="basic-link"
                :style="accordionStyleOverrides"
                class="accordion-header-label"
                :aria-expanded="isItemExpanded(question.question_id)"
                :aria-controls="`question-panel-${question.question_id}`"
                @click="toggleItemState(question.question_id)"
              >
                <span>{{ title + " " + question.counter_in_exercise }}</span>
                <KIcon
                  style="position: absolute; right:0; top: 0.92em"
                  :icon="isItemExpanded(question.question_id) ?
                    'chevronUp' : 'chevronRight'"
                />
              </KButton>
            </h3>
          </template>
          <template #content>
            <div
              v-if="isItemExpanded(question.question_id)"
              :id="`question-panel-${question.question_id}`"
              :ref="`question-panel-${question.question_id}`"
              :style="{ userSelect: dragActive ? 'none!important' : 'text' }"
            >
              <ContentRenderer
                :ref="`contentRenderer-${question.question_id}`"
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
      </template>
    </AccordionContainer>
    <div class="bottom-buttons-style">
      <KGrid>
        <KGridItem
          style="text-align: left;"
          :layout12="{ span: 8 }"
          :layout8="{ span: 6 }"
          :layout4="{ span: 3 }"
        >
          {{ numberOfSelectedReplacements$({
            count: replacements.length,
            total: selectedActiveQuestions.length }
          )
          }}
        </KGridItem>
        <KGridItem
          style="text-align: right;"
          :layout12="{ span: 4 }"
          :layout8="{ span: 2 }"
          :layout4="{ span: 1 }"
        >
          <KButton
            :primary="true"
            :text="replaceAction$()"
            :disable="replacements.length !== selectedActiveQuestions.length"
            @click="handleReplacement"
          />
        </KGridItem>
      </KGrid>
    </div>
    <ConfirmCancellationModal
      v-if="showConfirmationModal"
      @cancel="handleCancelClose"
      @continue="handleConfirmClose"
    />
  </div>

</template>


<script>

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { computed, ref } from 'kolibri.lib.vueCompositionApi';
  import { get } from '@vueuse/core';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import AccordionItem from './AccordionItem';
  import AccordionContainer from './AccordionContainer';
  import ConfirmCancellationModal from './ConfirmCancellationModal';

  export default {
    name: 'ReplaceQuestions',
    components: {
      AccordionContainer,
      AccordionItem,
      ConfirmCancellationModal,
    },
    setup(_, context) {
      const {
        replaceQuestions$,
        deleteSectionLabel$,
        replaceAction$,
        selectAllLabel$,
        replaceQuestionsExplaination$,
        numberOfSelectedReplacements$,
      } = enhancedQuizManagementStrings;
      const {
        // Computed
        activeQuestions,
        activeSection,
        selectedActiveQuestions,
        activeResourceMap,
        replacementQuestionPool,
        clearSelectedQuestions,
        toggleItemState,
        isItemExpanded,
        selectAllReplacementQuestions,
        replaceSelectedQuestions,
        toggleQuestionInSelection,
        updateSection,
      } = injectQuizCreation();

      const showConfirmationModal = ref(false);

      function handleCancelClose() {
        showConfirmationModal.value = false;
      }

      function handleConfirmClose() {
        context.emit('closePanel');
      }

      const replacements = ref([]);

      function handleReplacement() {
        const questionsNotSelectedToBeReplaced = activeQuestions.value.filter(
          question => !selectedActiveQuestions.value.includes(question.question_id)
        );
        updateSection({
          section_id: activeSection.value.section_id,
          questions: [...questionsNotSelectedToBeReplaced, ...replacements.value],
        });
        clearSelectedQuestions();
        context.emit('closePanel');
      }

      function toggleInReplacements(question) {
        const replacementIds = replacements.value.map(q => q.question_id);
        if (replacementIds.includes(question.question_id)) {
          replacements.value = replacements.value.filter(
            q => q.question_id !== question.question_id
          );
        } else {
          replacements.value.push(question);
        }
      }

      const selectAllIsIndeterminate = computed(() => {
        return (
          replacements.value.length > 0 &&
          replacements.value.length !== selectedActiveQuestions.value.length
        );
      });

      return {
        toggleInReplacements,
        handleReplacement,
        replacements,
        activeSection,
        selectAllReplacementQuestions,
        selectedActiveQuestions,
        replacementQuestionPool,
        selectAllIsIndeterminate,
        replaceSelectedQuestions,
        activeResourceMap,

        showConfirmationModal,
        handleCancelClose,
        handleConfirmClose,
        clearSelectedQuestions,
        toggleItemState,
        isItemExpanded,
        toggleQuestionInSelection,
        updateSection,
        replaceQuestions$,
        deleteSectionLabel$,
        replaceAction$,
        selectAllLabel$,
        replaceQuestionsExplaination$,
        numberOfSelectedReplacements$,
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
    },
    beforeRouteLeave(_, __, next) {
      if (!this.showConfirmationModal && this.formDataHasChanged) {
        this.showConfirmationModal = true;
        next(false);
      } else {
        next();
      }
    },
  };

</script>
