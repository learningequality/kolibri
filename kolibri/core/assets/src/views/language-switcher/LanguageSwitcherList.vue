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
        v-if="numSelectableLanguages > numVisibleLanguages + 1"
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
  import { compareLanguages } from 'kolibri.utils.sortLanguages';
  import languageSwitcherMixin from './mixin';
  import LanguageSwitcherModal from './LanguageSwitcherModal';

  const prioritizedLanguages = ['en', 'ar', 'es-419', 'hi-in', 'fr-fr', 'sw-tz'];

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
      selectableLanguages() {
        return Object.values(availableLanguages).filter(lang => lang.id !== currentLanguage);
      },
      selectedLanguage() {
        return availableLanguages[currentLanguage];
      },
      numVisibleLanguages() {
        // At windowBreakpoint = 0, only the "More languages" button will show
        return this.windowBreakpoint;
      },
      numSelectableLanguages() {
        return this.selectableLanguages.length;
      },
      buttonLanguages() {
        if (this.selectableLanguages.length <= this.numVisibleLanguages + 1) {
          return this.selectableLanguages.slice().sort(compareLanguages);
        }
        return this.selectableLanguages
          .slice()
          .sort((a, b) => {
            const aPriority = prioritizedLanguages.includes(a.id);
            const bPriority = prioritizedLanguages.includes(b.id);
            if (aPriority && bPriority) {
              return compareLanguages(a, b);
            } else if (aPriority && !bPriority) {
              return -1;
            } else if (!aPriority && bPriority) {
              return 1;
            }
            return compareLanguages(a, b);
          })
          .slice(0, this.numVisibleLanguages);
      },
    },
    $trs: {
      showMoreLanguagesSelector: {
        message: 'More languages',
        context: 'An option to view more languages in which the Kolibri interface is available.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './language-names';

  .globe {
    position: relative;
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
