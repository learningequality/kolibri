<template>

  <div>
    <core-modal
      :title="$tr('changeLanguageModalHeader')"
      @enter="setLang"
      @cancel="closeModal"
    >
      <p>{{ $tr('changeLanguageSubHeader') }}</p>
      <k-radio-button
        v-for="language in languageOptions"
        :key="language.id"
        :radiovalue="language.id"
        :label="language.lang_name"
        v-model="selectedLanguage"
      />
      <div class="footer">
        <k-button :text="$tr('cancelButtonText')" :raised="false" @click="closeModal"/>
        <k-button :text="$tr('confirmButtonText')" :primary="true" @click="setLang"/>
      </div>
    </core-modal>
  </div>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import languageSwitcherMixin from 'kolibri.coreVue.mixins.languageSwitcherMixin';

  export default {
    name: 'languageSwitcherModal',
    components: { coreModal, kButton, kRadioButton },
    mixins: [languageSwitcherMixin],
    $trs: {
      changeLanguageModalHeader: 'Change language',
      changeLanguageSubHeader: 'Select the language you want to view Kolibri in',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Confirm',
    },
    data() {
      return {
        selectedLanguage: this.currentLanguage,
      };
    },
    methods: {
      closeModal() {
        this.$emit('close');
      },
      setLang() {
        this.switchLanguage(this.selectedLanguage);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: right

</style>
