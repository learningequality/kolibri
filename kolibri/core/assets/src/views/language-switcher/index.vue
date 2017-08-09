<template>

  <core-modal :title="$tr('changeLanguageModalHeader')" @cancel="$emit('close')">
    <p>{{ $tr('changeLanguageSubHeader') }}</p>
    <p v-for="language in languageOptions" :class="selectedLanguage.code===language.code ? 'selected' : 'choice'" @click="selectedLanguage=language">
      {{ language.name }}
    </p>
    <div class="footer">
      <k-button :text="$tr('cancelButtonText')" :raised="false" :disabled="disabled" @click="$emit('close')"/>
      <k-button :text="$tr('confirmButtonText')" :primary="true" :disabled="disabled" @click="switchLanguage"/>
    </div>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { httpClient } from 'kolibri.client';
  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
  export default {
    name: 'languageSwitcherModalDialog',
    components: { coreModal, kButton },
    $trs: {
      changeLanguageModalHeader: 'Change language',
      changeLanguageSubHeader: 'Select the language you want to view Kolibri in',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Confirm',
    },
    computed: {
      languageOptions() {
        return Object.keys(availableLanguages)
          .sort((a, b) => {
            if (a === currentLanguage || a[0] > b[0]) {
              return -1;
            }
            if (b === currentLanguage || b[0] > a[0]) {
              return 1;
            }
            return 0;
          })
          .map(key => availableLanguages[key]);
      },
      currentLanguageName() {
        return availableLanguages[currentLanguage].name;
      },
    },
    data: () => ({
      disabled: false,
      selectedLanguage: availableLanguages[currentLanguage],
    }),
    methods: {
      switchLanguage() {
        this.disabled = true;
        const path = this.Kolibri.urls['kolibri:set_language']();
        const entity = {
          language: this.selectedLanguage.code,
        };
        httpClient({
          path,
          entity,
        }).then(() => {
          global.location.reload(true);
        });
      },
    },
  };

</script>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  h1, p
    color: black

  .selected
    font-weight: bold

  .choice
    color: $core-action-normal
    text-decoration: underline $core-action-normal
    cursor: pointer

</style>
