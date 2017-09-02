<template>

  <form @submit="setLanguage">
    <fieldset class="default-language-form">
      <legend>
        <h1 class="default-language-form-header">
          {{ $tr('languageFormHeader') }}
        </h1>
      </legend>

      <label class="default-language-form-selected">
        <span class="default-language-form-selected-label"> {{ $tr('selectedLanguageLabel') }} </span>
        <span> {{ currentLanguage }} </span>
      </label>

      <k-button
        v-for="language in buttonLanguages"
        class="default-language-form-language-button"
        :raised="false"
        :text="language.name"/>

      <label>
        <span class="visuallyhidden">More Languages</span>
        <select class="default-language-form-language-dropdown">
          <option disabled selected> {{ $tr('showMoreLanguagesSelector') }} </option>
          <option v-for="language in selectorLanguages" value="language.code">
            {{ language.name }}
          </option>
        </select>
      </label>

      <k-button :primary="true" type="submit" :text="submitText" />
    </fieldset>
  </form>

</template>


<script>

  import { availableLanguages as allLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import { submitDefaultLanguage } from '../../../state/actions/forms';
  import kButton from 'kolibri.coreVue.components.kButton';
  import omit from 'lodash/omit';

  const numberOfLanguageButtons = 4;

  // TODO add language switching logic

  export default {
    name: 'defaultLanguageForm',
    $trs: {
      languageFormHeader: 'Please select the default language for Kolibri',
      showMoreLanguagesSelector: 'MORE',
      selectedLanguageLabel: 'Selected',
    },
    components: { kButton },
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
        return allLanguages[currentLanguage].name;
      },
      remainingLanguages() {
        const remainingLanguages = Object.values(omit(allLanguages, [currentLanguage]));
        remainingLanguages.sort((lang1, lang2) => {
          // puts words with foreign characters first in the array
          return lang2.name.localeCompare(lang1.name);
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
  @require '../onboarding-form.styl'

  .default-language-form
    onboardingForm()

    &-header
      plainOnboardingHeader()

    &-selected
      display: inline-block

      &-label
        display: block
        font-size: 10px
        margin-bottom: 8px

</style>
