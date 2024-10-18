<template>

  <KFocusTrap
    @shouldFocusFirstEl="focusFirstEl"
    @shouldFocusLastEl="focusLastEl"
  >
    <KModal
      appendToOverlay
      :title="coreString('changeLanguageOption')"
      :submitText="coreString('confirmAction')"
      :cancelText="coreString('cancelAction')"
      :size="600"
      @cancel="cancel"
      @submit="setLang"
    >
      <KGrid>
        <KRadioButtonGroup>
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
              ref="languageItem"
              v-model="selectedLanguage"
              :buttonValue="language.id"
              :label="language.lang_name"
              :title="language.english_name"
              class="language-name"
            />
          </KGridItem>
        </KRadioButtonGroup>
      </KGrid>
    </KModal>
  </KFocusTrap>

</template>


<script>

  import { currentLanguage } from 'kolibri.utils.i18n';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import FocusTrap from 'kolibri.coreVue.components.FocusTrap';
  import languageSwitcherMixin from './mixin';

  export default {
    name: 'LanguageSwitcherModal',
    components: { FocusTrap },
    mixins: [commonCoreStrings, languageSwitcherMixin],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        windowIsSmall,
      };
    },
    data() {
      return {
        selectedLanguage: currentLanguage,
      };
    },
    computed: {
      splitLanguageOptions() {
        const secondCol = this.languageOptions;
        const firstCol = secondCol.splice(0, Math.ceil(secondCol.length / 2));

        return [firstCol, secondCol];
      },
    },
    methods: {
      focusFirstEl() {
        this.$refs.languageItem[0].focus();
      },
      focusLastEl() {
        this.$refs.languageItem[this.$refs.languageItem.length - 1].focus();
      },
      setLang() {
        if (currentLanguage === this.selectedLanguage) {
          this.cancel();
          return;
        }

        this.switchLanguage(this.selectedLanguage);
      },
      cancel() {
        this.$emit('cancel');
      },
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
