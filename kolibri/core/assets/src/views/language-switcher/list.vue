<template>

  <div>
    <ui-icon-button
      type="secondary"
      @click="showLanguageModal = true"
      class="globe"
    >
      <mat-svg
        name="language"
        category="action"
      />
    </ui-icon-button>

    <span class="selected">
      {{ selectedLanguage }}
    </span>
    <k-button
      v-for="language in buttonLanguages"
      @click="switchLanguage(language.id)"
      :key="language.id"
      :raised="false"
      :text="language.lang_name"
      class="lang"
      appearance="basic-link"
    />
    <k-button
      :text="$tr('showMoreLanguagesSelector')"
      :primary="false"
      appearance="flat-button"
      class="more"
      @click="showLanguageModal = true"
    />
    <language-switcher-modal
      v-if="showLanguageModal"
      @close="showLanguageModal = false"
      class="modal"
    />
  </div>

</template>


<script>

  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import kButton from 'kolibri.coreVue.components.kButton';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import languageSwitcherMixin from './mixin';
  import languageSwitcherModal from './modal';

  export default {
    name: 'languageSwitcherList',
    $trs: {
      showMoreLanguagesSelector: 'More languages',
    },
    components: {
      kButton,
      languageSwitcherModal,
      uiIconButton,
    },
    mixins: [responsiveWindow, languageSwitcherMixin],
    data() {
      return {
        showLanguageModal: false,
      };
    },
    computed: {
      selectedLanguage() {
        return availableLanguages[currentLanguage].lang_name;
      },
      numVisibleLanguages() {
        if (this.windowSize.breakpoint <= 2) {
          return 2;
        }
        return this.windowSize.breakpoint;
      },
      buttonLanguages() {
        const prioritized_languages = ['en', 'ar', 'es-es', 'hi-in', 'fr-fr', 'sw-tz'];
        return prioritized_languages
          .filter(lang => availableLanguages[lang] !== undefined)
          .filter(lang => lang !== currentLanguage)
          .map(lang => availableLanguages[lang])
          .slice(0, this.numVisibleLanguages)
          .sort(this.compareLanguages);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .globe
    position: relative
    top: -2px
    right: -4px

  .selected
    margin: 8px

  .lang
    margin-left: 8px
    margin-right: 8px

  .more
    margin: 0
    margin-top: 8px
    margin-bottom: 8px

  .modal
    text-align: left

</style>
