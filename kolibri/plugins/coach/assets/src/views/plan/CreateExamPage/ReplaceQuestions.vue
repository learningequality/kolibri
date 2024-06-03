<template>

  <div class="wrapper">
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
        id: i.id,
      }))"
    >
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
      <template #default="{ toggleItemState, isItemExpanded }">
        <AccordionItem
          v-for="(question, index) in replacementQuestionPool"
          :id="question.id"
          :key="index"
          :title="question.title"
          :aria-selected="
            replacements.length && replacements.length === selectedActiveQuestions.length
          "
        >
          <template #heading="{ title }">
            <h3
              class="accordion-header"
            >
              <KCheckbox
                class="accordion-checkbox"
                :checked="replacements.map(r => r.id).includes(question.id)"
                @change="() => toggleInReplacements(question)"
              />
              <KButton
                tabindex="0"
                appearance="basic-link"
                :style="accordionStyleOverrides"
                class="accordion-header-label"
                :aria-expanded="isItemExpanded(question.id)"
                :aria-controls="`question-panel-${question.id}`"
                @click="toggleItemState(question.id)"
              >
                <span>{{ title + " " + question.counter_in_exercise }}</span>
                <KIcon
                  style="position: absolute; right:1em; top: 0.625em;"
                  :icon="isItemExpanded(question.id) ?
                    'chevronUp' : 'chevronRight'"
                />
              </KButton>
            </h3>
          </template>
          <template #content>
            <div
              v-if="isItemExpanded(question.id)"
              :id="`question-panel-${question.id}`"
              :ref="`question-panel-${question.id}`"
              :style="{ userSelect: dragActive ? 'none!important' : 'text' }"
            >
              <ContentRenderer
                :ref="`contentRenderer-${question.id}`"
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
    <div class="bottom-navigation">
      <KGrid>
        <KGridItem
          style="text-align: left;"
          :layout12="{ span: 8 }"
          :layout8="{ span: 6 }"
          :layout4="{ span: 3 }"
        >
          {{ replaceSelectedQuestionsString }}
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
            :disabled="!canProceedToReplace"
            @click="confirmReplacement"
          />
        </KGridItem>
      </KGrid>
    </div>
    <NotEnoughResourcesModal
      v-if="showNoEnoughResources"
      :selectedQuestions="selectedActiveQuestions"
      :availableResources="replacementQuestionPool"
      @close="closeNoEnoughResourcesModal"
      @addResources="redirectToSelectResources"
    />
    <KModal
      v-if="showReplacementConfirmation"
      :submitText="coreString('confirmAction')"
      :cancelText="coreString('cancelAction')"
      :title="replaceQuestions$()"
      @cancel="showReplacementConfirmation = false"
      @submit="submitReplacement"
    >
      <div> {{ replaceQuestionsExplaination$() }} </div>
      <div style="font-weight: bold;">
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

  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { getCurrentInstance, computed, ref } from 'kolibri.lib.vueCompositionApi';
  import { get } from '@vueuse/core';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { injectQuizCreation } from '../../../composables/useQuizCreation';
  import { PageNames } from '../../../constants/index';
  import AccordionItem from './AccordionItem';
  import AccordionContainer from './AccordionContainer';
  import NotEnoughResourcesModal from './NotEnoughResourcesModal';

  export default {
    name: 'ReplaceQuestions',
    components: {
      NotEnoughResourcesModal,
      AccordionContainer,
      AccordionItem,
    },
    mixins: [commonCoreStrings],
    setup(_, context) {
      const router = getCurrentInstance().proxy.$router;
      const {
        replaceQuestions$,
        deleteSectionLabel$,
        replaceAction$,
        selectAllLabel$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        replaceQuestionsExplaination$,
        numberOfSelectedReplacements$,
        numberOfQuestionsReplaced$,
        noUndoWarning$,
        selectMoreQuestion$,
        selectFewerQuestion$,
      } = enhancedQuizManagementStrings;
      const {
        // Computed
        activeSection,
        selectedActiveQuestions,
        activeResourceMap,
        replacementQuestionPool,
        clearSelectedQuestions,
        toggleItemState,
        isItemExpanded,
        replaceSelectedQuestions,
        toggleQuestionInSelection,
        updateSection,
        handleReplacement,
        replacements,
      } = injectQuizCreation();

      const showCloseConfirmation = ref(false);
      const showReplacementConfirmation = ref(false);
      const showNoEnoughResources = ref(false);

      showNoEnoughResources.value =
        replacementQuestionPool.value.length < selectedActiveQuestions.value.length;

      function handleConfirmClose() {
        replacements.value = [];
        context.emit('closePanel');
      }

      function submitReplacement() {
        const count = replacements.value.length;
        handleReplacement();
        this.clearSelectedQuestions();
        router.replace({
          name: PageNames.EXAM_CREATION_ROOT,
        });
        this.$store.dispatch('createSnackbar', numberOfQuestionsReplaced$({ count }));
      }

      function confirmReplacement() {
        showReplacementConfirmation.value = true;
      }

      function toggleInReplacements(question) {
        const replacementIds = replacements.value.map(q => q.id);
        if (replacementIds.includes(question.id)) {
          replacements.value = replacements.value.filter(q => q.id !== question.id);
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

      return {
        toggleInReplacements,
        activeSection,
        selectAllReplacementQuestions,
        selectedActiveQuestions,
        replacementQuestionPool,
        selectAllIsIndeterminate,
        selectAllIsChecked,
        replaceSelectedQuestions,
        activeResourceMap,
        showNoEnoughResources,
        showCloseConfirmation,
        showReplacementConfirmation,
        confirmReplacement,

        handleConfirmClose,
        clearSelectedQuestions,
        toggleItemState,
        isItemExpanded,
        toggleQuestionInSelection,
        updateSection,
        submitReplacement,
        replacements,
        replaceQuestions$,
        deleteSectionLabel$,
        replaceAction$,
        selectAllLabel$,
        numberOfSelectedReplacements$,
        closeConfirmationMessage$,
        closeConfirmationTitle$,
        noUndoWarning$,
        replaceQuestionsExplaination$,
        selectMoreQuestion$,
        selectFewerQuestion$,
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
        } else if (unreplacedCount > 0) {
          return this.selectMoreQuestion$({
            count: unreplacedCount,
          });
        } else {
          return this.selectFewerQuestion$({
            count: Math.abs(unreplacedCount),
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
    methods: {
      redirectToSelectResources() {
        const route = this.$router.getRoute(PageNames.QUIZ_SELECT_RESOURCES, {
          section_id: this.activeSection.section_id,
        });
        this.$router.replace(route);
      },
      closeNoEnoughResourcesModal() {
        this.showNoEnoughResources = false;
        this.$emit('closePanel');
      },
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
    bottom: 1.5em;
    left: 0;
    width: 100%;
    padding: 1em;
    text-align: center;
    background-color: white;
    border-top: 1px solid black;

    div {
      line-height: 2.5em;
    }
  }

  .accordion-checkbox {
    margin-bottom: 0;
    margin-left: 1em;
  }

  .select-all-box {
    margin-left: 1em;
  }

</style>
