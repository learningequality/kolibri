<template>

  <div>
    <UiIconButton
      type="secondary"
      class="globe"
      aria-hidden="true"
      tabindex="-1"
      @click="showLanguageModal = true"
    >
      <KIcon
        icon="language"
        style="top: 0; width: 24px; height: 24px;"
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
      v-if="numSelectableLanguages > numVisibleLanguages + 1"
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
  import { compareLanguages } from 'kolibri.utils.sortLanguages';
  import UiIconButton from 'kolibri-design-system/lib/keen/UiIconButton';
  import languageSwitcherMixin from './mixin';
  import LanguageSwitcherModal from './LanguageSwitcherModal';

  const prioritizedLanguages = ['en', 'ar', 'es-419', 'hi-in', 'fr-fr', 'sw-tz'];

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
      selectableLanguages() {
        return Object.values(availableLanguages).filter(lang => lang.id !== currentLanguage);
      },
      selectedLanguage() {
        return availableLanguages[currentLanguage];
      },
      numVisibleLanguages() {
        if (this.windowBreakpoint <= 2) {
          return 2;
        }
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
