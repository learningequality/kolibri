<template>

  <div class="quiz-header">
    <span>
      {{ quizTitle }}
    </span>
    <div class="quiz-header-actions">
      <KButton
        appearance="flat-button"
        :disabled="settings.isInReplaceMode"
        :text="settingsLabel$()"
        @click="onSettingsClick"
      >
        <template #icon>
          <KIcon
            icon="settings"
            class="setting-icon"
          />
        </template>
      </KButton>
      <KButton
        v-if="!hideSearch"
        icon="filter"
        :text="searchLabel$()"
        @click="$emit('searchClick')"
      />
      <slot name="actions"></slot>
    </div>
  </div>

</template>


<script>

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import { PageNames } from '../../../constants';

  export default {
    name: 'QuizResourceSelectionHeader',
    setup() {
      const { searchLabel$, settingsLabel$ } = coreStrings;

      return {
        searchLabel$,
        settingsLabel$,
      };
    },
    props: {
      settings: {
        type: Object,
        required: true,
      },
      hideSearch: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      quizTitle() {
        const { selectNQuestions$, selectUpToNResources$, selectUpToNQuestions$ } =
          enhancedQuizManagementStrings;

        if (this.settings.isInReplaceMode) {
          return selectNQuestions$({ count: this.settings.questionCount });
        }
        if (this.settings.isChoosingManually) {
          return selectUpToNQuestions$({ count: this.settings.questionCount });
        }
        return selectUpToNResources$({ count: this.settings.questionCount });
      },
    },
    methods: {
      onSettingsClick() {
        this.$router.push({ name: PageNames.QUIZ_SELECT_RESOURCES_SETTINGS });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .quiz-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .quiz-header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: flex-end;
  }

  .setting-icon {
    margin-right: 4px;
    font-size: 20px;
  }

</style>
