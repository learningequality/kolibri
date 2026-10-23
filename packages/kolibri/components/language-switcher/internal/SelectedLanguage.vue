<template>

  <div class="selected-language">
    <KIconButton
      icon="language"
      aria-hidden="true"
      tabindex="-1"
      class="globe px-8"
      @click="$emit('click')"
    />
    <span
      class="no-shrink px-8"
      :title="selectedLanguage.english_name"
    >
      <span
        class="visuallyhidden"
        data-testid="current-language-label"
      >
        {{ currentLanguageLabel$({ language: selectedLanguage.lang_name }) }}
      </span>
      <span aria-hidden="true">{{ selectedLanguage.lang_name }}</span>
    </span>
  </div>

</template>


<script>

  import { createTranslator } from 'kolibri/utils/i18n';

  export const selectedLanguageStrings = createTranslator('SelectedLanguage', {
    currentLanguageLabel: {
      message: 'Current language, {language}',
      context:
        'Screen-reader-only label stating the interface language that is currently selected.',
    },
  });

  export default {
    name: 'SelectedLanguage',
    setup() {
      const { currentLanguageLabel$ } = selectedLanguageStrings;
      return { currentLanguageLabel$ };
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
