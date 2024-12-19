<template>

  <KSelect
    v-if="languageOptions.length"
    :options="languageOptions"
    :disabled="!languageId && enabledLanguageOptions.length < 2"
    :clearable="!(!languageId && enabledLanguageOptions.length < 2)"
    :clearText="coreString('clearAction')"
    :value="selectedLanguage"
    :label="coreString('languageLabel')"
    @change="val => (languageId = val && val.value)"
  />

</template>


<script>

  import { computed } from 'vue';
  import { get } from '@vueuse/core';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';

  export default {
    name: 'LanguageSelector',
    mixins: [commonCoreStrings],
    setup(props) {
      const {
        languageOptions,
        enabledLanguageOptions,
        currentLanguageId,
        currentPrimaryLanguageId,
      } = injectBaseSearch();

      const languageId = computed({
        get: () => (props.primary ? currentPrimaryLanguageId.value : currentLanguageId.value),
        set: val => {
          if (props.primary) {
            currentPrimaryLanguageId.value = val;
          } else {
            currentLanguageId.value = val;
          }
        },
      });

      const selectedLanguage = computed(
        () => get(languageOptions).find(lang => lang.value === get(languageId)) || {},
      );

      return {
        languageOptions,
        enabledLanguageOptions,
        languageId,
        selectedLanguage,
      };
    },
    props: {
      primary: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>
