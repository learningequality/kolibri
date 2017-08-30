<template>

  <form @submit="submitDefaultLanguage(selectedLanguage)" class="language-form">
    <fieldset>
      <legend>
        <h1 class="language-form-header">
          Select default language
        </h1>
      </legend>

      <label>
        <span class="language-form-selected-label"> Selected: </span>
        <span class="language-form-selected"> {{ currentLanguage }} </span>
      </label>

      <k-button
        v-for="language in buttonLanguages"
        class="language-form-language-button"
        :raised="false"
        :text="language.name"/>

      <label>
        <span class="visuallyhidden">More Languages</span>
        <select>
          <option disabled selected> MORE </option>
          <option v-for="language in selectorLanguages" value="language.code">
            {{ language.name }}
          </option>
        </select>
      </label>

      <k-button type="submit" :text="submitText" />
    </fieldset>
  </form>

</template>


<script>

  import { availableLanguages as allLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import { submitDefaultLanguage } from '../../../state/actions/forms';
  import kButton from 'kolibri.coreVue.components.kButton';
  import omit from 'lodash/omit';

  const numberOfLanguageButtons = 4;

  // Leaving outside for now. Doesn't really need to be reactive.
  const remainingLanguages = Object.values(omit(allLanguages, [currentLanguage]));
  remainingLanguages.sort((lang1, lang2) => {
    // puts words with foreign characters first in the array
    return lang2.name.localeCompare(lang1.name);
  });

  const buttonLanguages = remainingLanguages.slice(0, numberOfLanguageButtons);
  const selectorLanguages = remainingLanguages.slice(numberOfLanguageButtons);

  export default {
    name: 'defaultLanguageForm',
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
        buttonLanguages,
        selectorLanguages,
      };
    },
    computed: {
      currentLanguage() {
        return allLanguages[currentLanguage].name;
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

  .language-form
    &-selected
      &-label
        display: block

</style>
