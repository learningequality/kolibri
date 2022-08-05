<template>

  <!-- Always base-container class, wrapping screen size class when small -->
  <div
    :class="{ 'base-container': true, 'windowIsSmall': windowIsSmall }"
    :style="{ 'background-color': windowIsSmall ? $themeTokens.surface : '' }"
    @keyup.enter="handleEnterKey"
  >

    <div class="logo-lang-container">
      <!--
        Small Screen: Back button (if not hidden by prop)
        Med-Lg Screen: Logo
        -->
      <div v-if="!windowIsSmall" class="logo-wrapper">
        <CoreLogo class="logo-image" />
        <span class="logo-text">{{ coreString('kolibriLabel') }}</span>
      </div>

      <KIconButton
        v-else-if="!noBackAction"
        class="back-icon-button"
        icon="back"
        @click="wizardService.send('BACK')"
      />

      <!-- Language switcher visible regardless of screen size -->
      <KButton
        class="languages-button"
        icon="language"
        :text="selectedLanguage.lang_name"
        :primary="false"
        appearance="flat-button"
        @click="showLanguageModal = true"
      />
    </div>

    <!-- topMargin & noPadding props for KPageContainer - harmless when case of div -->
    <component
      :is="windowIsSmall ? 'div' : 'KPageContainer'"
      :topMargin="16"
      :noPadding="true"
    >
      <div class="content">
        <h1 class="title">
          {{ title }}
        </h1>
        <p v-if="description" class="description">
          {{ description }}
        </p>
        <slot></slot>
      </div>

      <!-- Border hidden on mobile by making it the same as the background -->
      <div
        class="footer"
        :style="{
          borderTop: `1px solid ${windowIsSmall ? $themeTokens.surface : $themeTokens.fineLine}`
        }"
      >
        <!-- No room for slot on small screens.
             On med+ screens, to be used to show short strings of text eg, "Step 1 / 4" -->
        <div v-if="!windowIsSmall" class="footer-section">
          <slot name="footer"></slot>
        </div>


        <!-- Footer for medium+ screens -->
        <KButtonGroup v-if="!windowIsSmall" class="footer-actions footer-section">
          <!-- Allow direct override of the buttons in the footer -->
          <slot name="buttons"></slot>
          <!-- Default buttons, hidden when the slot is used -->
          <KButton
            v-if="!noBackAction && !$slots.buttons"
            :text="coreString('goBackAction')"
            appearance="flat-button"
            :primary="false"
            :disabled="navDisabled"
            @click="wizardService.send('BACK')"
          />
          <KButton
            v-if="!$slots.buttons"
            :text="coreString('continueAction')"
            :primary="true"
            :disabled="navDisabled"
            @click="$emit('continue')"
          />
        </KButtonGroup>

        <!-- Simpler to do a big button for the small screen separately -->
        <div v-if="windowIsSmall" class="mobile-footer">
          <!-- Allow direct override of the buttons in the footer -->
          <slot name="buttons"></slot>
          <KButton
            v-if="!$slots.buttons"
            class="mobile-continue-button"
            :text="coreString('continueAction')"
            :primary="true"
            :disabled="navDisabled"
            @click="$emit('continue')"
          />
        </div>
      </div>
    </component>

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
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';

  export default {
    name: 'OnboardingStepBase',
    components: { CoreLogo, LanguageSwitcherModal },
    inject: ['wizardService'],
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {
      noBackAction: {
        type: Boolean,
        default: false,
      },
      navDisabled: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        default: null,
      },
      description: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        showLanguageModal: false,
      };
    },
    computed: {
      selectedLanguage() {
        return availableLanguages[currentLanguage];
      },
    },
    methods: {
      /* If the user is focused on a form element and hits enter, continue */
      handleEnterKey(e) {
        e.preventDefault();
        if (!this.navDisabled & (e.target.tagName === 'INPUT')) {
          this.$emit('continue');
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../../../../core/assets/src/styles/definitions';

  .base-container {
    max-width: $page-container-max-width;
    padding-bottom: 5em;
    margin: 5em auto 0;

    &.windowIsSmall {
      width: 100vw;
      height: 100vh;
      margin: 0;
    }
  }

  .logo-lang-container {
    position: relative;
    width: 100%;
    height: 32px;
  }

  .title {
    font-size: 1.5em;
  }

  .description {
    padding-bottom: 8px;
    font-size: 0.875em;
  }

  .windowIsSmall .logo-lang-container {
    padding: 16px;
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

  .windowIsSmall .languages-button {
    top: 16px;
    right: 16px;
  }

  // Padding difference between small vs medium+ screens is to account for
  // default margins on H tags.
  .content {
    padding: 16px 32px 32px;
  }

  .windowIsSmall .content {
    padding: 32px;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    padding: 16px 32px;
  }

  .footer-section {
    max-width: 50%;

    &.footer-actions {
      // Aligns action buttons with right-most text
      margin-right: -16px;
    }
  }

  .windowIsSmall .footer-section {
    width: 100%;
    max-width: 100%;
  }

  .mobile-footer {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 64px;
    padding: 16px;
  }

  .mobile-continue-button {
    width: 100%;
  }

  .ta-l {
    text-align: left;
  }

  /deep/ .truncate-text {
    /* Override KRadioButton default behavior of eliding text with ellipsis to ensure word wrap */

    /* This will effect the entire onboarding experience */
    white-space: normal;
  }

</style>
