<template>

  <div>
    <label
      :class="[
        'language-list-selected',
        'language-list-items',
        (isMobile ? 'mobile' : '')
      ]">
      <div class="language-list-selected-label">
        {{ $tr('selectedLanguageLabel') }}
      </div>
      <div>
        {{ selectedLanguage }}
      </div>
    </label>

    <k-button
      v-for="language in buttonLanguages"
      class="language-list-button-option language-list-items"
      @click="switchLanguage(language.id)"
      :key="language.id"
      :raised="false"
      :text="language.lang_name"
    />

    <select
      @input="switchLanguage($event.target.value)"
      v-if="selectorLanguages.length"
      class="language-list-dropdown language-list-items">
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
        class="language-list-dropdown-option"
      >
        {{ language.lang_name }}
      </option>
    </select>
  </div>

</template>


<script>

  import { availableLanguages as allLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import languageSwitcherMixin from 'kolibri.coreVue.mixins.languageSwitcherMixin';

  import kButton from 'kolibri.coreVue.components.kButton';

  import omit from 'lodash/omit';

  const mobileNumberOfLanguageButtons = 5;
  const desktopNumberOfLanguageButtons = 3;

  export default {
    name: 'languageSwitcherList',
    $trs: {
      showMoreLanguagesSelector: 'More',
      selectedLanguageLabel: 'Selected language',
    },
    mixins: [responsiveWindow, languageSwitcherMixin],
    components: { kButton },
    data() {
      return {
        selectedLanguageId: currentLanguage,
      };
    },
    computed: {
      isMobile() {
        return this.windowSize.breakpoint < 4;
      },
      selectedLanguage() {
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
      numberOfLanguageButtons() {
        let numBtns = this.isMobile ? mobileNumberOfLanguageButtons : desktopNumberOfLanguageButtons;
        // prevent a case where the selector menu has just a single item
        if (Object.keys(allLanguages).length === numBtns + 2) {
          return numBtns + 1;
        }
        return numBtns;
      },
      buttonLanguages() {
        return this.remainingLanguages.slice(0, this.numberOfLanguageButtons);
      },
      selectorLanguages() {
        return this.remainingLanguages.slice(this.numberOfLanguageButtons);
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

  .language-list
    &-items
      margin: 0
      margin-right: 8px
      margin-bottom: 8px

    &-selected
      display: inline-block
      font-weight: bold
      &.mobile
        display: block

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
