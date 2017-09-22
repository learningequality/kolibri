<template>

  <div>
    <div v-if="footer" class="page-footer">
      <ul class="language-list">
        <li v-for="language in languageOptions" :class="selectedLanguage===language.id ? 'selected item' : 'choice item'" @click="setAndSwitchLanguage(language.id)">
          {{ language.lang_name }}
        </li>
      </ul>
    </div>
    <core-modal
      v-if="showModal"
      class="core-text"
      :title="$tr('changeLanguageModalHeader')"
      @cancel="closeModal">
      <p>{{ $tr('changeLanguageSubHeader') }}</p>
      <k-radio-button
        v-for="language in languageOptions"
        :key="language.id"
        :radiovalue="language.id"
        :value="selectedLanguage"
        :label="language.lang_name"
        v-model="selectedLanguage"
      />
      <div class="footer">
        <k-button :text="$tr('cancelButtonText')" appearance="flat" :disabled="disabled" @click="closeModal"/>
        <k-button :text="$tr('confirmButtonText')" :primary="true" :disabled="disabled" @click="switchLanguage"/>
      </div>
    </core-modal>
  </div>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { httpClient } from 'kolibri.client';
  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
  export default {
    name: 'languageSwitcherModalDialog',
    components: { coreModal, kButton, kRadioButton },
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
      currentLanguageName() {
        return availableLanguages[currentLanguage].lang_name;
      },
      showModal() {
        return this.modalOpen || this.internalModalOpen;
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
      selectedLanguage: currentLanguage,
      internalModalOpen: false,
    }),
    methods: {
      switchLanguage() {
        this.disabled = true;
        const path = this.Kolibri.urls['kolibri:set_language']();
        const entity = {
          language: this.selectedLanguage,
        };
        httpClient({
          path,
          entity,
        }).then(() => {
          global.location.reload(true);
        });
      },
      setAndSwitchLanguage(languageCode) {
        if (languageCode != this.selectedLanguage) {
          this.selectedLanguage = languageCode;
          this.switchLanguage();
        }
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .core-text
    color: $core-text-default

  .choice
    color: $core-action-normal

  .selected
    font-weight: bold

  .page-footer
    padding-left: 32px
    padding-top: 16px
    padding-bottom: 16px
    text-align: center
    button
      float: right
      position: absolute

  .prompt
    padding-right: 16px

  .language-list
    list-style: none
    margin: 0
    padding: 0
    text-align: initial
    display: inline-block

  .item
    display: inline-block
    padding-top: 6px
    padding-right: 20px
    &.choice
      cursor: pointer

</style>
