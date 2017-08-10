<template>

  <div>
    <div class="page-footer">
      <div class="lang-container">
        <p class="prompt" v-if="!isMobile">{{ $tr('changeLanguagePrompt') }}</p>
        <p v-for="language in footerLanguageOptions" :class="selectedLanguage.code===language.code ? 'selected' : 'choice'" @click="setAndSwitchLanguage(language)">
          {{ language.name }}
        </p>
      </div>
      <k-button style="margin-top: 0" :text="$tr('moreLanguageButtonText')" :raised="false" @click="setModalOpen"/>
    </div>
    <core-modal
      v-if="showModal"
      :title="$tr('changeLanguageModalHeader')"
      @cancel="closeModal">
      <p>{{ $tr('changeLanguageSubHeader') }}</p>
      <p v-for="language in languageOptions" :class="selectedLanguage.code===language.code ? 'selected' : 'choice'" @click="selectedLanguage=language">
        {{ language.name }}
      </p>
      <div class="footer">
        <k-button :text="$tr('cancelButtonText')" :raised="false" :disabled="disabled" @click="closeModal"/>
        <k-button :text="$tr('confirmButtonText')" :primary="true" :disabled="disabled" @click="switchLanguage"/>
      </div>
    </core-modal>
  </div>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { httpClient } from 'kolibri.client';
  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  export default {
    name: 'languageSwitcherModalDialog',
    mixins: [responsiveWindow],
    components: { coreModal, kButton },
    $trs: {
      changeLanguageModalHeader: 'Change language',
      changeLanguageSubHeader: 'Select the language you want to view Kolibri in',
      changeLanguagePrompt: 'Select language:',
      moreLanguageButtonText: 'More languages',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Confirm',
    },
    computed: {
      languageOptions() {
        return Object.keys(availableLanguages)
          .sort((a, b) => {
            if (a === currentLanguage) {
              return -1;
            }
            if (b === currentLanguage) {
              return 1;
            }
            if (a[0] < b[0]) {
              return -1;
            }
            if (b[0] < a[0]) {
              return 1;
            }
            return 0;
          })
          .map(key => availableLanguages[key]);
      },
      footerLanguageOptions() {
        if (this.isMobile) {
          return this.languageOptions.filter(lang => lang.code !== currentLanguage).slice(0, 3);
        }
        return this.languageOptions.slice(0, 6);
      },
      currentLanguageName() {
        return availableLanguages[currentLanguage].name;
      },
      showModal() {
        console.log(this.internalModalOpen);
        return this.modalOpen || this.internalModalOpen;
      },
      isMobile() {
        return this.windowSize.breakpoint <= 1;
      },
    },
    props: {
      footer: {
        type: Boolean,
        default: false,
      },
      modalOpen: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      disabled: false,
      selectedLanguage: availableLanguages[currentLanguage],
      internalModalOpen: false,
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
      setAndSwitchLanguage(language) {
        this.selectedLanguage = language;
        this.switchLanguage();
      },
      closeModal() {
        this.internalModalOpen = false;
        this.$emit('close');
      },
      setModalOpen() {
        console.log('setting open');
        this.internalModalOpen = true;
      },
    },
  };

</script>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  h1, p
    color: black

  .more-button
    float: left

  .selected
    font-weight: bold

  .choice
    color: $core-action-normal
    text-decoration: underline $core-action-normal
    cursor: pointer


  .page-footer
    padding-left: 32px
    padding-top: 16px
    padding-bottom: 16px
    .lang-container
      display: inline-block
      width: 40%
      p
        float: left
        padding-left: 10px
        margin: 0
    button
      float: right
      position: absolute

  .prompt
    padding-right: 16px

</style>
