<template>

  <KSelect
    v-if="options.length"
    :options="options"
    :disabled="disabled"
    :clearable="clearable"
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
  import { injectBaseSearch, allLanguagesValue } from 'kolibri-common/composables/useBaseSearch';

  export default {
    name: 'LanguageSelector',
    mixins: [commonCoreStrings],
    setup(props) {
      const { languageOptions, currentLanguageId, currentPrimaryLanguageId } = injectBaseSearch();

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

      const onlyOneLanguage = computed(() => {
        if (props.primary) {
          return get(languageOptions).length < 2;
        }
        return get(languageOptions).reduce((total, l) => (total += !l.disabled ? 1 : 0), 0) < 2;
      });

      const options = computed(() => {
        if (!props.primary) {
          return get(languageOptions);
        }
        return get(languageOptions).map(lang => ({
          ...lang,
          disabled: props.primary ? false : lang.disabled,
        }));
      });

      const noLanguageSelected = computed(() => {
        return !languageId.value || languageId.value === allLanguagesValue;
      });

      const disabled = computed(() => {
        return noLanguageSelected.value && onlyOneLanguage.value;
      });

      const clearable = computed(() => {
        return !noLanguageSelected.value && !onlyOneLanguage.value;
      });

      return {
        options,
        disabled,
        clearable,
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
