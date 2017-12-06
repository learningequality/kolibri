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
      appearance="basic-link"
    />

    <k-select
      v-if="moreLanguages.length"
      :label="$tr('showMoreLanguagesSelector')"
      :options="moreLanguages"
      :inline="true"
      v-model="moreLanguagesSelection"
      @change="switchLanguage($event.value)"
      class="language-list-dropdown"
    />
  </div>

</template>


<script>

  import { availableLanguages as allLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import languageSwitcherMixin from 'kolibri.coreVue.mixins.languageSwitcherMixin';

  import kButton from 'kolibri.coreVue.components.kButton';
  import kSelect from 'kolibri.coreVue.components.kSelect';

  const mobileNumberOfLanguageButtons = 5;
  const desktopNumberOfLanguageButtons = 3;

  export default {
    name: 'languageSwitcherList',
    $trs: {
      showMoreLanguagesSelector: 'More languages',
      selectedLanguageLabel: 'Selected language',
    },
    components: { kButton, kSelect },
    mixins: [responsiveWindow, languageSwitcherMixin],
    data() {
      return {
        selectedLanguageId: currentLanguage,
        moreLanguagesSelection: {},
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
        return this.languageOptions.filter(lang => lang.id !== currentLanguage);
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
      moreLanguages() {
        return this.remainingLanguages.slice(this.numberOfLanguageButtons).map(lang => {
          return { label: lang.lang_name, value: lang.id };
        });
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
      display: inline-block
      margin-right: 16px
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

  .language-list-dropdown
    margin-bottom: 8px

</style>
