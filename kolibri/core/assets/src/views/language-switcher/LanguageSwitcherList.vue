<template>

  <div>
    <UiIconButton
      type="secondary"
      class="globe"
      aria-hidden="true"
      tabindex="-1"
      @click="showLanguageModal = true"
    >
      <mat-svg
        name="language"
        category="action"
      />
    </UiIconButton>

    <span class="selected" :title="selectedLanguage.english_name">
      {{ selectedLanguage.lang_name }}
    </span>
    <KButton
      v-for="language in buttonLanguages"
      :key="language.id"
      :text="language.lang_name"
      :title="language.english_name"
      class="lang"
      appearance="basic-link"
      @click="switchLanguage(language.id)"
    />
    <KButton
      :text="$tr('showMoreLanguagesSelector')"
      :primary="false"
      appearance="flat-button"
      class="more"
      @click="showLanguageModal = true"
    />
    <LanguageSwitcherModal
      v-if="showLanguageModal"
      class="ta-l"
      @cancel="showLanguageModal = false"
    />
  </div>

</template>


<script>

  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import languageSwitcherMixin from './mixin';
  import LanguageSwitcherModal from './LanguageSwitcherModal';

  export default {
    name: 'LanguageSwitcherList',
    components: {
      LanguageSwitcherModal,
      UiIconButton,
    },
    mixins: [responsiveWindowMixin, languageSwitcherMixin],
    data() {
      return {
        showLanguageModal: false,
      };
    },
    computed: {
      selectedLanguage() {
        return availableLanguages[currentLanguage];
      },
      numVisibleLanguages() {
        if (this.windowBreakpoint <= 2) {
          return 2;
        }
        return this.windowBreakpoint;
      },
      buttonLanguages() {
        const prioritized_languages = ['en', 'ar', 'es-419', 'hi-in', 'fr-fr', 'sw-tz'];
        return prioritized_languages
          .filter(lang => availableLanguages[lang] !== undefined)
          .filter(lang => lang !== currentLanguage)
          .map(lang => availableLanguages[lang])
          .slice(0, this.numVisibleLanguages)
          .sort(this.compareLanguages);
      },
    },
    $trs: {
      showMoreLanguagesSelector: 'More languages',
    },
  };

</script>


<style lang="scss" scoped>

  @import './language-names';

  .globe {
    position: relative;
    top: -2px;
    right: -4px;
  }

  .selected {
    margin: 8px;
  }

  .lang {
    @include font-family-language-names;

    margin-right: 8px;
    margin-left: 8px;
  }

  .more {
    margin: 0;
    margin-top: 8px;
    margin-bottom: 8px;
  }

  .ta-l {
    text-align: left;
  }

</style>
