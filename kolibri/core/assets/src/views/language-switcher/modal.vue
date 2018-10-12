<template>

  <k-modal
    :title="$tr('changeLanguageModalHeader')"
    :submitText="$tr('confirmButtonText')"
    :cancelText="$tr('cancelButtonText')"
    @submit="setLang"
    @cancel="closeModal"
  >
    <div class = "language-list">
      <k-radio-button
        v-for="language in languageOptions"
        :key="language.id"
        :value="language.id"
        :label="language.lang_name"
        v-model="selectedLanguage"
      />
    </div>

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


<style lang="scss" scoped>

  .language-list {
    display: flex;
    flex-wrap: wrap;
  }

  @media only screen and (min-width: 375px) {
    .language-list {
      .k-radio-button {
        flex: 1 0 calc(50% - 10px);
        margin-top: 10px;
        margin-left: 10px;
      }
    }
  }

  @media only screen and (max-width: 374px) {
    .language-list {
      .k-radio-button {
        flex: 1 0 200px;
      }
    }
  }

</style>
