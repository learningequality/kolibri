<template>

  <div>
    <mat-svg
      slot="icon"
      name="language"
      category="action"
      class="icon"
    />
    <span>
      {{ selectedLanguage }}
    </span>
    <k-button
      v-for="language in buttonLanguages"
      @click="switchLanguage(language.id)"
      :key="language.id"
      :raised="false"
      :text="language.lang_name"
      appearance="basic-link"
    />
    <k-button
      :text="$tr('showMoreLanguagesSelector')"
      :primary="false"
      appearance="flat-button"
      @click="showLanguageModal = true"
    />
    <language-switcher-modal
      v-if="showLanguageModal"
      @close="showLanguageModal = false"
      class="override-ui-toolbar"
    />
  </div>

</template>


<script>

  import { availableLanguages as allLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import kButton from 'kolibri.coreVue.components.kButton';
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
    },
    mixins: [languageSwitcherMixin],
    data() {
      return {
        showLanguageModal: false,
      };
    },
    computed: {
      selectedLanguage() {
        return allLanguages[currentLanguage].lang_name;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .icon
    position: relative
    top: 6px

</style>
