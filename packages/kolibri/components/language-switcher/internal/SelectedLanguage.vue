<template>

  <div class="selected-language">
    <KIconButton
      icon="language"
      :ariaLabel="changeLanguageLabel"
      class="globe px-8"
      @click="$emit('click')"
    />
    <span
      class="no-shrink px-8"
      aria-hidden="true"
      :title="selectedLanguage.english_name"
    >
      {{ selectedLanguage.lang_name }}
    </span>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { createTranslator } from 'kolibri/utils/i18n';

  export const selectedLanguageStrings = createTranslator('SelectedLanguage', {
    changeLanguageButtonLabel: {
      message: 'Change language, currently {language}',
      context:
        'Accessible label for the control that opens the language switcher, stating the currently selected interface language.',
    },
  });

  export default {
    name: 'SelectedLanguage',
    setup(props) {
      const { changeLanguageButtonLabel$ } = selectedLanguageStrings;
      const changeLanguageLabel = computed(() =>
        changeLanguageButtonLabel$({ language: props.selectedLanguage.lang_name }),
      );
      return { changeLanguageLabel };
    },
    props: {
      selectedLanguage: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style scoped>

  .selected-language {
    display: flex;
    align-items: center;
  }

  .no-shrink {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .px-8 {
    padding-right: 8px;
    padding-bottom: 2px;
    padding-left: 8px;
  }

</style>
