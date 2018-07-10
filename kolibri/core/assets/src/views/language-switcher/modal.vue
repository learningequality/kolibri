<template>

  <k-modal
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
  </k-modal>

</template>


<script>

  import kModal from 'kolibri.coreVue.components.kModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { currentLanguage } from 'kolibri.utils.i18n';
  import languageSwitcherMixin from './mixin';

  export default {
    name: 'languageSwitcherModal',
    components: { kModal, kRadioButton },
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
