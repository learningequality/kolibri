<template>

  <onboarding-form :header="$tr('languageFormHeader')" :submit-text="submitText" @submit="setLanguage">
    <label class="default-language-form-selected default-language-form-items">
      <span class="default-language-form-selected-label"> {{ $tr('selectedLanguageLabel') }} </span>
      <span> {{ currentLanguage }} </span>
    </label>

    <k-button
      v-for="language in buttonLanguages"
      class="default-language-form-button-option default-language-form-items"
      @click="selectedLanguage = language.code"
      :key="language.code"
      :raised="false"
      :text="language.lang_name"
    />

    <select class="default-language-form-dropdown default-language-form-items">
      <option
        disabled
        selected
        hidden
      >
        {{ $tr('showMoreLanguagesSelector').toUpperCase() }}
      </option>

      <option
        v-for="language in selectorLanguages"
        class="default-language-form-dropdown-option"
        value="language.id"
      >
        {{ language.lang_name }}
      </option>
    </select>
  </onboarding-form>

</template>


<script>

  import { availableLanguages as allLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import { submitDefaultLanguage } from '../../../state/actions/forms';

  import kButton from 'kolibri.coreVue.components.kButton';
  import onboardingForm from '../onboarding-form';

  import omit from 'lodash/omit';
  import sortBy from 'lodash/sortBy';

  const numberOfLanguageButtons = 4;

  // TODO add language switching logic
  // TODO move default logic into state

  export default {
    name: 'defaultLanguageForm',
    $trs: {
      languageFormHeader: 'Please select the default language for Kolibri',
      showMoreLanguagesSelector: 'More',
      selectedLanguageLabel: 'Selected',
    },
    components: { kButton, onboardingForm },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        selectedLanguage: currentLanguage,
      };
    },
    computed: {
      currentLanguage() {
        return allLanguages[currentLanguage].lang_name;
      },
      remainingLanguages() {
        const remainingLanguages = Object.values(omit(allLanguages, [currentLanguage]));
        remainingLanguages.sort((lang1, lang2) => {
          // puts words with foreign characters first in the array
          return lang2.lang_name.localeCompare(lang1.lang_name);
        });

        return remainingLanguages;
      },
      buttonLanguages() {
        return this.remainingLanguages.slice(0, numberOfLanguageButtons);
      },
      selectorLanguages() {
        return this.remainingLanguages.slice(numberOfLanguageButtons);
      },
    },
    methods: {
      setLanguage() {
        this.submitDefaultLanguage(this.selectedLanguage);
        this.$emit('submit');
      },
    },
    vuex: {
      actions: {
        submitDefaultLanguage,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .default-language-form
    &-items
      margin: 0
      margin-right: 8px
      margin-bottom: 8px

    &-selected
      display: inline-block
      font-weight: bold

      &-label
        display: block
        font-weight: normal
        font-size: 10px
        margin-bottom: 8px

    &-button-option
      color: $core-action-dark

</style>
