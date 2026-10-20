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

  export default {
    name: 'SelectedLanguage',
    props: {
      selectedLanguage: {
        type: Object,
        required: true,
      },
    },
    computed: {
      changeLanguageLabel() {
        return this.$tr('changeLanguageButtonLabel', {
          language: this.selectedLanguage.lang_name,
        });
      },
    },
    $trs: {
      changeLanguageButtonLabel: {
        message: 'Change language, currently {language}',
        context:
          'Accessible label for the control that opens the language switcher, stating the currently selected interface language.',
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
