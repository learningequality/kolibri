<template>

  <div class="base-container">

    <div class="logo-lang-container">
      <div class="logo-wrapper">
        <CoreLogo class="logo-image" />
        <span class="logo-text">{{ coreString('kolibriLabel') }}</span>
      </div>

      <KButton
        class="languages-button"
        icon="language"
        :text="selectedLanguage.lang_name"
        :primary="false"
        appearance="flat-button"
        @click="showLanguageModal = true"
      />
    </div>

    <KPageContainer :topMargin="16" :noPadding="true" :style="contentContainerStyles">
      <div class="content">
        <slot></slot>
      </div>
      <div 
        v-if="$slots.footer" 
        class="footer" 
        :style="{ borderTop: `1px solid ${$themeTokens.fineLine}` }"
      >
        <slot name="footer"></slot>
      </div>
    </KPageContainer>

    <LanguageSwitcherModal
      v-if="showLanguageModal"
      class="ta-l"
      @cancel="showLanguageModal = false"
    />

  </div>

</template>


<script>

  import CoreLogo from 'kolibri.coreVue.components.CoreLogo';
  import LanguageSwitcherModal from 'kolibri.coreVue.components.LanguageSwitcherModal';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';

  export default {
    name: 'OnboardingStepBase',
    components: { CoreLogo, LanguageSwitcherModal },
    mixins: [commonCoreStrings],
    data() {
      return {
        showLanguageModal: false,
      };
    },
    computed: {
      contentContainerStyles() {
        return {};
      },
      selectedLanguage() {
        return availableLanguages[currentLanguage];
      },
    },
  };

</script>


<style lang="scss" scoped>

  .base-container {
    max-width: 700px;
    margin: 10% auto 0;
  }

  .logo-lang-container {
    position: relative;
    width: 100%;
    height: 32px;
  }

  .logo-wrapper {
    position: absolute;
    left: 0;
    // Match height of parent
    height: 100%;

    .logo-image {
      width: auto;
      height: 32px;
    }

    .logo-text {
      position: absolute;
      // Aligns text vertically with logo
      bottom: 3px;
      // Spaces the text from the logo
      left: 48px;
      font-size: 18px;
    }
  }

  .languages-button {
    position: absolute;
    // Aligns text with right side of content container
    right: -16px;
    // Aligns button vertically with logo
    bottom: -2px;
    font-size: 14px;
    font-weight: bold;
  }

  .content {
    padding: 32px;
  }

  .footer {
    padding: 16px 32px;
  }

</style>
