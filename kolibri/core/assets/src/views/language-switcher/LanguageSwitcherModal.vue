<template>

  <KModal
    :title="$tr('changeLanguageModalHeader')"
    :submitText="$tr('confirmButtonText')"
    :cancelText="$tr('cancelButtonText')"
    @submit="setLang"
    @cancel="closeModal"
  >

    <KGrid>
      <KGridItem
        v-for="language in languageOptions"
        :key="language.id"
        sizes = "100, 100, 50"
        percentage
        alignment = "left"
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


<style lang="scss" scoped></style>

