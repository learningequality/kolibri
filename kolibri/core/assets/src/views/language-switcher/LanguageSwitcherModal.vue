<template>

  <KModal
    :title="$tr('changeLanguageModalHeader')"
    :submitText="coreCommon$tr('confirmAction')"
    :cancelText="coreCommon$tr('cancelAction')"
    @cancel="$emit('cancel')"
    @submit="setLang"
  >
    <KGrid>
      <KGridItem
        v-for="(languageCol, index) in splitLanguageOptions"
        :key="index"
        :class="{ 'offset-col': windowIsSmall && index === 1 }"
        sizes="100, 50, 50"
        percentage
        alignment="left"
      >
        <KRadioButton
          v-for="language in languageCol"
          :key="language.id"
          v-model="selectedLanguage"
          :value="language.id"
          :label="language.lang_name"
          :title="language.english_name"
          class="language-name"
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
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';
  import languageSwitcherMixin from './mixin';

  export default {
    name: 'LanguageSwitcherModal',
    components: {
      KModal,
      KGrid,
      KGridItem,
      KRadioButton,
    },
    mixins: [coreStringsMixin, languageSwitcherMixin, responsiveWindow],
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
      setLang() {
        this.switchLanguage(this.selectedLanguage);
      },
    },
    $trs: {
      changeLanguageModalHeader: 'Change language',
    },
  };

</script>


<style lang="scss" scoped>

  @import './language-names';

  .language-name {
    @include font-family-language-names;
  }

  .offset-col {
    margin-top: -8px;
  }

</style>
