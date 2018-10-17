<template>

  <KModal
    :title="$tr('changeLanguageModalHeader')"
    :submitText="$tr('confirmButtonText')"
    :cancelText="$tr('cancelButtonText')"
    @submit="setLang"
    @cancel="closeModal"
  >
    <KGrid
      class="language-column"
      v-for="(languageCol, index) in splitLanguageOptions"
      :key="index"
    >
      <KGridItem
        class="language-item"
        v-for="language in languageCol"
        :key="language.id"
        sizes="100, 100, 50"
        percentage
        alignment="left"
      >
        <KRadioButton
          :value="language.id"
          :label="language.lang_name"
          v-model="selectedLanguage"
        />
      </KGridItem>
    </KGrid>

  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import { currentLanguage } from 'kolibri.utils.i18n';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import languageSwitcherMixin from './mixin';

  export default {
    name: 'LanguageSwitcherModal',
    components: {
      KModal,
      KGrid,
      KGridItem,
      KRadioButton,
    },
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
    computed: {
      splitLanguageOptions() {
        let secondCol = this.languageOptions;
        let firstCol = secondCol.splice(0, Math.ceil(secondCol.length / 2));

        return [firstCol, secondCol];
      },
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

  @media only screen and (min-width: 840px) {
    .language-column {
      display: inline-block;
      width: 50%;
      margin: 20px 0;
      &:nth-child(2) {
        padding-left: 20px;
      }
    }
  }

  .language-item {
    .k-radio-button {
      margin: 4px 0;
    }
  }

</style>

