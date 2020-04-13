<template>

  <div>
    <KButtonGroup style="margin-top: 8px;">
      <KIconButton
        icon="language"
        aria-hidden="true"
        tabindex="-1"
        class="globe"
        @click="showLanguageModal = true"
      />
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
        @click="showLanguageModal = true"
      />
    </KButtonGroup>
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
  import languageSwitcherMixin from './mixin';
  import LanguageSwitcherModal from './LanguageSwitcherModal';

  export default {
    name: 'LanguageSwitcherList',
    components: {
      LanguageSwitcherModal,
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
    margin-left: 8px;
  }

  .lang {
    @include font-family-language-names;
  }

  .ta-l {
    text-align: left;
  }

</style>
