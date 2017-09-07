<template>

  <onboarding-form :header="$tr('languageFormHeader')" :submit-text="submitText" @submit="setLanguage">
    <label class="default-language-form-selected default-language-form-items">
      <span class="default-language-form-selected-label"> {{ $tr('selectedLanguageLabel') }} </span>
      <span> {{ selectedLanguage }} </span>
    </label>

    <k-button
      v-for="language in buttonLanguages"
      class="default-language-form-button-option default-language-form-items"
      @click="changeLanguage(language.id)"
      :key="language.id"
      :raised="false"
      :text="language.lang_name"
    />

    <select
      @input="changeLanguage($event.target.value)"
      class="default-language-form-dropdown default-language-form-items">
      <option
        disabled
        selected
        hidden
      >
        {{ $tr('showMoreLanguagesSelector') }}
      </option>

      <option
        v-for="language in selectorLanguages"
        :key="language.id"
        :value="language.id"
        class="default-language-form-dropdown-option"
      >
        {{ language.lang_name }}, {{language.id}}
      </option>
    </select>
  </onboarding-form>

</template>


<script>

  import {
    availableLanguages as allLanguages,
    currentLanguage as currentLanguageId,
  } from 'kolibri.utils.i18n';
  import { httpClient } from 'kolibri.client';
  import { submitDefaultLanguage } from '../../../state/actions/forms';

  import kButton from 'kolibri.coreVue.components.kButton';
  import onboardingForm from '../onboarding-form';

  import omit from 'lodash/omit';
  import sortBy from 'lodash/sortBy';

  const numberOfLanguageButtons = 4;

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
        selectedLanguageId: currentLanguageId,
      };
    },
    computed: {
      selectedLanguage() {
        return allLanguages[this.selectedLanguageId].lang_name;
      },
      remainingLanguages() {
        const remainingLanguages = Object.values(omit(allLanguages, [this.selectedLanguageId]));
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
      changeLanguage(languageId) {
        this.selectedLanguageId = languageId;
        const path = this.Kolibri.urls['kolibri:set_language']();
        const entity = {
          language: this.selectedLanguageId,
        };
        httpClient({
          path,
          entity,
        }).then(() => {
          global.location.reload(true);
        });
      },
      setLanguage() {
        this.submitDefaultLanguage(this.selectedLanguageId);
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

  $k-button-styles()
    padding: 0 16px
    min-width: 64px
    min-height: 36px
    border-radius: 2px
    font-size: 14px
    font-weight: bold
    line-height: 36px
    text-transform: uppercase
    max-width: 100%

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

    &-dropdown
      $k-button-styles()
      width: 100px
      background-color: $core-grey-200
      &-option
        text-transform: none
        background-color: $core-bg-light

</style>
