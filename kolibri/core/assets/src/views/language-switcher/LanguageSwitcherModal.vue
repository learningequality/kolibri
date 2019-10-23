<template>

  <KModal
    :title="$tr('changeLanguageModalHeader')"
    :submitText="coreString('confirmAction')"
    :cancelText="coreString('cancelAction')"
    @cancel="$emit('cancel')"
    @submit="setLang"
  >
    <KGrid>
      <KGridItem
        v-for="(languageCol, index) in splitLanguageOptions"
        :key="index"
        :class="{ 'offset-col': windowIsSmall && index === 1 }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
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

  import { currentLanguage } from 'kolibri.utils.i18n';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import languageSwitcherMixin from './mixin';

  export default {
    name: 'LanguageSwitcherModal',
    mixins: [commonCoreStrings, languageSwitcherMixin, responsiveWindowMixin],
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
