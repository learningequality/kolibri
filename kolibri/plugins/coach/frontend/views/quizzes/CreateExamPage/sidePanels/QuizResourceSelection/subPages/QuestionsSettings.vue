<template>

  <div>
    <div class="mb-20">
      {{ maxNumberOfQuestionsInfo$({ count: settings.maxQuestions }) }}
    </div>
    <UiAlert
      v-if="showAlert && addableQuestionCount < settings.maxQuestions"
      type="warning"
      @dismiss="showAlert = false"
    >
      {{ insufficientResources$({ count: addableQuestionCount }) }}
    </UiAlert>
    <div class="number-question">
      <div>
        <KTextbox
          v-model.number="questionCount"
          type="number"
          :label="numberOfQuestionsLabel$()"
          :max="maxQuestions"
          :min="1"
          :invalid="questionCount > maxQuestions"
          :invalidText="maxNumberOfQuestions$({ count: maxQuestions })"
          :disabled="!questionCountIsEditable"
          :showInvalidText="true"
          class="question-textbox"
        />
      </div>
      <div>
        <div
          :style="{
            border: `1px solid ${$themeTokens.fineLine}`,
          }"
          class="group-button-border"
        >
          <KIconButton
            icon="minus"
            aria-hidden="true"
            :disabled="questionCount === 1 || !questionCountIsEditable"
            @click="questionCount -= 1"
          />
          <span :style="{ color: $themeTokens.fineLine }"> | </span>
          <KIconButton
            icon="plus"
            aria-hidden="true"
            :disabled="questionCount >= maxQuestions || !questionCountIsEditable"
            @click="questionCount += 1"
          />
        </div>
      </div>
    </div>
    <KCheckbox
      :checked="isChoosingManually"
      :label="chooseQuestionsManuallyLabel$()"
      :description="clearSelectionNotice$()"
      @change="$event => (isChoosingManually = $event)"
    />
  </div>

</template>


<script>

  import { ref, computed, getCurrentInstance, onMounted, onUnmounted, watch } from 'vue';
  import {
    displaySectionTitle,
    enhancedQuizManagementStrings,
  } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import { useGoBack } from 'kolibri-common/composables/usePreviousRoute.js';
  import { PageNames } from '../../../../../../constants';
  import { injectQuizCreation } from '../../../../../../composables/useQuizCreation';

  /**
   * @typedef {import('../../../../../../composables/useFetch').FetchObject} FetchObject
   */

  export default {
    name: 'SelectFromBookmarks',
    components: {
      UiAlert,
    },
    setup(props) {
      const showAlert = ref(true);
      const instance = getCurrentInstance();
      const router = instance.proxy.$router;

      const { data: channels } = props.channelsFetch;

      const addableQuestionCount = computed(() => {
        return channels.value.reduce((total, currentObject) => {
          return total + currentObject.num_assessments;
        }, 0);
      });

      const {
        questionsSettingsLabel$,
        numberOfQuestionsLabel$,
        maxNumberOfQuestionsInfo$,
        maxNumberOfQuestions$,
        chooseQuestionsManuallyLabel$,
        clearSelectionNotice$,
      } = enhancedQuizManagementStrings;

      const { insufficientResources$ } = searchAndFilterStrings;
      const { activeSection, activeSectionIndex } = injectQuizCreation();

      props.setTitle(
        questionsSettingsLabel$({
          sectionTitle: displaySectionTitle(activeSection.value, activeSectionIndex.value),
        }),
      );

      if (props.settings.isInReplaceMode) {
        // guard against opening settings page in replace mode
        router.replace({
          name: PageNames.QUIZ_SELECT_RESOURCES_INDEX,
        });
      }

      const goBack = useGoBack({
        fallbackRoute: {
          name: PageNames.QUIZ_SELECT_RESOURCES_INDEX,
        },
      });

      const redirectBack = props.isLanding ? null : goBack;

      props.setGoBack(redirectBack);

      const workingQuestionCount = ref(props.settings.questionCount);
      const workingIsChoosingManually = ref(Boolean(props.settings.isChoosingManually));

      const invalidSettings = computed(() => {
        if (workingIsChoosingManually.value) {
          return false;
        }

        return (
          workingQuestionCount.value > props.settings.maxQuestions || workingQuestionCount.value < 1
        );
      });

      const continueHandler = () => {
        instance.proxy.$emit('update:settings', {
          ...props.settings,
          questionCount: Math.min(workingQuestionCount.value, props.settings.maxQuestions),
          isChoosingManually: workingIsChoosingManually.value,
        });

        goBack();
      };

      const { continueAction$, saveAction$ } = coreStrings;
      const continueText = props.isLanding ? continueAction$() : saveAction$();

      onMounted(() => {
        props.setContinueAction({
          handler: continueHandler,
          text: continueText,
        });
      });
      watch(invalidSettings, () => {
        props.setContinueAction({
          handler: continueHandler,
          disabled: invalidSettings.value,
          text: continueText,
        });
      });
      onUnmounted(() => {
        props.setContinueAction(null);
      });

      const questionCountIsEditable = computed(() => !workingIsChoosingManually.value);

      return {
        showAlert,
        questionCount: workingQuestionCount,
        isChoosingManually: workingIsChoosingManually,
        clearSelectionNotice$,
        questionCountIsEditable,
        maxQuestions: computed(() =>
          addableQuestionCount.value > props.settings.maxQuestions
            ? props.settings.maxQuestions
            : addableQuestionCount.value,
        ),
        maxNumberOfQuestions$,
        numberOfQuestionsLabel$,
        maxNumberOfQuestionsInfo$,
        chooseQuestionsManuallyLabel$,
        insufficientResources$,
        addableQuestionCount,
      };
    },
    props: {
      setTitle: {
        type: Function,
        default: () => {},
      },
      setGoBack: {
        type: Function,
        default: () => {},
      },
      setContinueAction: {
        type: Function,
        default: () => {},
      },
      settings: {
        type: Object,
        required: true,
      },
      isLanding: {
        type: Boolean,
        default: false,
      },
      channelsFetch: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .number-question {
    display: inline-flex;
  }

  .group-button-border {
    display: inline-flex;
    align-items: center;
    height: 3.5em;
    border: 1px solid;
  }

  .mb-20 {
    margin-bottom: 20px;
  }

  .question-textbox /deep/ div {
    margin-bottom: 0;
  }

</style>
