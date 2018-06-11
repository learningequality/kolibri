<template>

  <core-modal
    :title="$tr('changeLanguageModalHeader')"
    :submitText="$tr('confirmButtonText')"
    :cancelText="$tr('cancelButtonText')"
    @submit="setLang"
    @cancel="closeModal"
  >
    <k-radio-button
      v-for="language in languageOptions"
      :key="language.id"
      :value="language.id"
      :label="language.lang_name"
      v-model="selectedLanguage"
    />
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import languageSwitcherMixin from 'kolibri.coreVue.mixins.languageSwitcherMixin';
  import { currentLanguage } from 'kolibri.utils.i18n';

  export default {
    name: 'languageSwitcherModal',
    components: { coreModal, kRadioButton },
    mixins: [languageSwitcherMixin],
    $trs: {
      changeLanguageModalHeader: 'Change language',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Confirm',
    },
    data() {
      return {
        selectedLanguage: currentLanguage,
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


<style lang="stylus"></style>
