<template>

  <div>
    <div class="languages-list">
      <KIconButton
        icon="language"
        aria-hidden="true"
        tabindex="-1"
        class="globe px-8"
        @click="showLanguageModal = true"
      />
      <span class="selected no-shrink px-8" :title="selectedLanguage.english_name">
        {{ selectedLanguage.lang_name }}
      </span>
      <KListWithOverflow
        :items="buttonLanguages"
        :appearanceOverrides="{
          justifyContent: 'flex-start',
          alignItems: 'center',
        }"
      >
        <template #item="{ item }">
          <KButton
            :text="item.lang_name"
            :title="item.english_name"
            class="lang px-8"
            appearance="basic-link"
            @click="switchLanguage(item.id)"
          />
        </template>
        <template #more>
          <KButton
            :text="$tr('showMoreLanguagesSelector')"
            :primary="false"
            class="px-8"
            appearance="flat-button"
            @click="showLanguageModal = true"
          />
        </template>
      </KListWithOverflow>
    </div>
    <LanguageSwitcherModal
      v-if="showLanguageModal"
      class="ta-l"
      @cancel="showLanguageModal = false"
    />
  </div>

</template>


<script>

  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import useKResponsiveWindow from 'kolibri-design-system/lib/useKResponsiveWindow';
  import { compareLanguages } from 'kolibri.utils.sortLanguages';
  import languageSwitcherMixin from './mixin';
  import LanguageSwitcherModal from './LanguageSwitcherModal';

  const prioritizedLanguages = ['en', 'ar', 'es-419', 'hi-in', 'fr-fr', 'sw-tz'];

  export default {
    name: 'LanguageSwitcherList',
    components: {
      LanguageSwitcherModal,
    },
    mixins: [languageSwitcherMixin],
    setup() {
      const { windowBreakpoint } = useKResponsiveWindow();
      return {
        windowBreakpoint,
      };
    },
    props: {
      parentBreakpoint: {
        type: Number,
        default: -1,
      },
    },
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
      numSelectableLanguages() {
        return this.selectableLanguages.length;
      },
      buttonLanguages() {
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

  .languages-list {
    margin-top: 8px;
    position: relative;
    left: -16px;
    display: flex;
    align-items: center;
  }

  .no-shrink {
    flex-shrink: 0;
  }

  .px-8 {
    padding-left: 8px;
    padding-right: 8px;
  }

</style>
