<template>

  <div>
    <div class="languages-list">
      <KListWithOverflow
        :items="buttonLanguages"
        :appearanceOverrides="{
          justifyContent: center ? 'center' : 'flex-start',
          alignItems: 'center',
        }"
      >
        <template #item="{ item }">
          <KButton
            v-if="!item.isSelected"
            :text="item.lang_name"
            :title="item.english_name"
            class="lang px-8"
            appearance="basic-link"
            @click="switchLanguage(item.id)"
          />
          <SelectedLanguage
            v-else
            :selectedLanguage="item"
            @click="showLanguageModal = true"
          />
        </template>
        <template #more="{ overflowItems }">
          <div>
            <SelectedLanguage
              v-if="overflowItems.length === buttonLanguages.length"
              :selectedLanguage="selectedLanguage"
              @click="showLanguageModal = true"
            />
            <KButton
              :text="$tr('showMoreLanguagesSelector')"
              class="px-8"
              appearance="flat-button"
              @click="showLanguageModal = true"
            />
          </div>
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

  import { availableLanguages, compareLanguages, currentLanguage } from 'kolibri/utils/i18n';
  import LanguageSwitcherModal from 'kolibri/components/language-switcher/LanguageSwitcherModal';
  import languageSwitcherMixin from './internal/mixin';
  import SelectedLanguage from './internal/SelectedLanguage';

  const prioritizedLanguages = ['en', 'ar', 'es-419', 'hi-in', 'fr-fr', 'sw-tz'];

  export default {
    name: 'LanguageSwitcherList',
    components: {
      SelectedLanguage,
      LanguageSwitcherModal,
    },
    mixins: [languageSwitcherMixin],
    props: {
      center: {
        type: Boolean,
        default: false,
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
      buttonLanguages() {
        const buttonLanguages = this.selectableLanguages.slice().sort((a, b) => {
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
        });
        buttonLanguages.unshift({
          ...this.selectedLanguage,
          isSelected: true,
        });
        return buttonLanguages;
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

  @import './internal/language-names';

  .globe {
    position: relative;
    right: -4px;
  }

  .lang {
    @include font-family-language-names;

    /deep/ span {
      white-space: nowrap !important;
    }
  }

  .ta-l {
    text-align: left;
  }

  .languages-list {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 8px;
  }

  .px-8 {
    padding-right: 8px;
    padding-left: 8px;
  }

  .lang-icon {
    min-width: 40px;
  }

</style>
