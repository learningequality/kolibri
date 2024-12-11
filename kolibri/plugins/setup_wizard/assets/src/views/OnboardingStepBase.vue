<template>

  <!-- Always base-container class, wrapping screen size class when small -->
  <div
    :class="{ 'base-container': true, 'window-is-small': windowIsSmall }"
    :style="{ 'background-color': windowIsSmall ? $themeTokens.surface : '' }"
    @keyup.enter="handleEnterKey"
  >
    <div class="logo-lang-container">
      <!--
        Small Screen: Back button (if not hidden by prop)
        Med-Lg Screen: Logo
        -->
      <div
        v-if="!windowIsSmall"
        class="logo-wrapper"
      >
        <CoreLogo class="logo-image" />
        <span class="logo-text">{{ coreString('kolibriLabel') }}</span>
      </div>

      <KIconButton
        v-else-if="!noBackAction"
        class="back-icon-button"
        icon="back"
        @click="wizardService.send(eventOnGoBack)"
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
      <div
        v-if="coreError"
        style="padding: 16px"
      >
        <AppError :hideParagraphs="true">
          <h2>{{ coreError }}</h2>
          <template #buttons>
            <KButton
              :text="coreString('startOverAction')"
              :primary="true"
              @click="startOver"
            />
          </template>
        </AppError>
      </div>
      <div
        v-else
        class="content"
      >
        <!-- Optional back arrow to show at the top for longer content views -->
        <KIconButton
          v-if="showBackArrow"
          icon="back"
          style="margin-left: -12px"
          @click="wizardService.send(eventOnGoBack)"
        />

        <h1 class="title">
          {{ title }}
        </h1>

        <p
          v-if="description"
          class="description"
        >
          {{ description }}
        </p>
        <slot></slot>
      </div>

      <!-- Border hidden on mobile by making it the same as the background -->
      <div
        v-if="!coreError"
        class="footer"
        :style="{
          borderTop: `1px solid ${windowIsSmall ? $themeTokens.surface : $themeTokens.fineLine}`,
        }"
      >
        <!-- No room for slot on small screens.
             On med+ screens, to be used to show short strings of text eg, "Step 1 / 4" -->
        <div
          v-if="!windowIsSmall"
          class="footer-section"
        >
          <slot name="footer"></slot>
          {{ footerMessage }}
        </div>

        <!-- Footer for medium+ screens -->
        <KButtonGroup
          v-if="!windowIsSmall"
          class="footer-actions footer-section"
        >
          <!-- Allow direct override of the buttons in the footer -->
          <slot name="buttons"></slot>
          <!-- Default buttons, hidden when the slot is used -->
          <KButton
            v-if="!noBackAction && !$slots.buttons"
            :text="coreString('goBackAction')"
            appearance="flat-button"
            :primary="false"
            :disabled="navDisabled"
            @click="wizardService.send(eventOnGoBack)"
          />
          <KButton
            v-if="!$slots.buttons && !hideContinue"
            :text="coreString('continueAction')"
            :primary="true"
            :disabled="navDisabled"
            @click="$emit('continue')"
          />
        </KButtonGroup>

        <!-- Simpler to do a big button for the small screen separately -->
        <div
          v-if="windowIsSmall"
          class="mobile-footer"
        >
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

  import CoreLogo from 'kolibri/components/CoreLogo';
  import LanguageSwitcherModal from 'kolibri/components/language-switcher/LanguageSwitcherModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import AppError from 'kolibri/components/error/AppError';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import { availableLanguages, currentLanguage } from 'kolibri/utils/i18n';
  import { FooterMessageTypes } from '../constants';

  export default {
    name: 'OnboardingStepBase',
    components: { AppError, CoreLogo, LanguageSwitcherModal },
    inject: ['wizardService'],
    mixins: [commonCoreStrings],
    setup() {
      const { windowIsSmall } = useKResponsiveWindow();
      return { windowIsSmall };
    },
    props: {
      /**
       * The event sent to the state machine when the user clicks GO BACK.
       * Can be an object with the `type` and `value` and used to include data
       * to the state machine to use during the transition back.
       */
      eventOnGoBack: {
        type: Object,
        default: () => ({ type: 'BACK' }),
      },
      showBackArrow: {
        type: Boolean,
        default: false,
      },
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
      hideContinue: {
        type: Boolean,
        default: false,
      },
      footerMessageType: {
        type: String,
        default: null,
        validate(str) {
          return Object.keys(FooterMessageTypes).includes(str);
        },
      },
      step: {
        type: Number,
        default: null,
      },
      steps: {
        type: Number,
        default: null,
      },
    },
    data() {
      return {
        showLanguageModal: false,
      };
    },
    computed: {
      footerMessage() {
        switch (this.footerMessageType) {
          case FooterMessageTypes.NEW_FACILITY:
            return this.$tr('newLearningFacilitySteps', { step: this.step, steps: this.steps });
          case FooterMessageTypes.IMPORT_FACILITY:
            return this.$tr('importLearningFacilitySteps', { step: this.step, steps: this.steps });
          case FooterMessageTypes.IMPORT_INDIVIDUALS:
            return this.$tr('importIndividualUsersSteps', { step: this.step, steps: this.steps });
          case FooterMessageTypes.JOIN_FACILITY:
            return this.$tr('joinLearningFacilitySteps', { step: this.step, steps: this.steps });
          default:
            return null;
        }
      },
      selectedLanguage() {
        return availableLanguages[currentLanguage];
      },
      coreError() {
        if (this.$store) {
          return this.$store.state.core.error;
        } else {
          return null;
        }
      },
    },
    methods: {
      startOver() {
        this.wizardService.send('START_OVER');
        this.$store.dispatch('clearError');
      },
      /* If the user is focused on a form element and hits enter, continue */
      handleEnterKey(e) {
        e.preventDefault();
        if (!this.navDisabled & (e.target.tagName === 'INPUT')) {
          this.$emit('continue');
        }
      },
    },
    $trs: {
      newLearningFacilitySteps: {
        message: 'New learning facility - {step} of {steps}',
        context:
          'A message indicating to the user the number of steps in the process and\n        how far along they are in the process',
      },
      importLearningFacilitySteps: {
        message: 'Import learning facility - {step} of {steps}',
        context:
          'A message indicating to the user the number of steps in the process and\n        how far along they are in the process',
      },
      importIndividualUsersSteps: {
        message: 'Import individual user accounts - {step} of {steps}',
        context:
          'A message indicating to the user the number of steps in the process and\n        how far along they are in the process',
      },
      joinLearningFacilitySteps: {
        message: 'Join learning facility - {step} of {steps}',
        context:
          'A message indicating to the user the number of steps in the process and\n        how far along they are in the process',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import 'kolibri-common/styles/definitions';

  .base-container {
    max-width: $page-container-max-width;
    padding-bottom: 5em;
    margin: 5em auto 0;

    &.window-is-small {
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

  .window-is-small .logo-lang-container {
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
      bottom: 5px;
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

  .window-is-small .languages-button {
    top: 16px;
    right: 16px;
  }

  // Padding difference between small vs medium+ screens is to account for
  // default margins on H tags.
  .content {
    padding: 16px 32px 32px;
  }

  .window-is-small .content {
    padding: 32px;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    padding: 16px 32px;
  }

  .footer-section {
    max-width: 50%;
    line-height: 2.5;

    &.footer-actions {
      // Aligns action buttons with right-most text
      margin-right: -16px;
    }
  }

  .window-is-small .footer-section {
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
