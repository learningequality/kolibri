<template>

  <form>
    <fieldset>
      <legend>
        <h1>
          Select default language
        </h1>
      </legend>

      <label>
        <span> Selected: </span>
        <span> {{ currentLanguage }} </span>
      </label>

      <k-button v-for="language in buttonLanguages" :raised="false" :text="language.name"/>
      <select>
        <option v-for="language in selectorLanguages" value="language.code">
          {{ language.name }}
        </option>
      </select>

    </fieldset>
  </form>

</template>


<script>

  import { availableLanguages as allLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import kButton from 'kolibri.coreVue.components.kButton';
  import omit from 'lodash/omit';

  const numberOfLanguageButtons = 4;

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
  };

</script>


<style lang="stylus" scoped></style>
