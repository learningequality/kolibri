<template>

  <div>
    <core-modal
      :title="$tr('changeLanguageModalHeader')"
      @enter="setLang"
      @cancel="closeModal"
    >
      <k-radio-button
        v-for="language in languageOptions"
        :key="language.id"
        :value="language.id"
        :label="language.lang_name"
        v-model="selectedLanguage"
      />
      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancelButtonText')"
          :raised="false"
          @click="closeModal"
        />
        <k-button
          :text="$tr('confirmButtonText')"
          :primary="true"
          @click="setLang"
        />
      </div>
    </core-modal>
  </div>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { currentLanguage } from 'kolibri.utils.i18n';
  import languageSwitcherMixin from './mixin';

  export default {
    name: 'languageSwitcherModal',
    components: { coreModal, kButton, kRadioButton },
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
