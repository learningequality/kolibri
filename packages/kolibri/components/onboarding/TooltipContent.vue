<template>

  <KFocusTrap
    @shouldFocusFirstEl="focusFirstEl"
    @shouldFocusLastEl="focusLastEl"
  >
    <div
      class="onboarding-tooltip"
      role="dialog"
      aria-modal="true"
    >
      <h1 class="visuallyhidden">
        {{
          onboardingStepDescription$({
            pageTitle: getTranslatedPageLabel(),
            currentStep: currentStepIndex + 1,
            totalSteps: steps.length,
          })
        }}
      </h1>
      <div class="onboarding-tooltip-header">
        <div class="onboarding-tooltip-progress">
          <span
            v-for="(step, index) in steps"
            :key="index"
            class="dot"
            :style="{
              backgroundColor:
                index === currentStepIndex ? $themeBrand.primary.v_500 : $themePalette.grey.v_300,
            }"
          ></span>
        </div>
        <KIconButton
          ref="closeButton"
          icon="close"
          :ariaLabel="coreString('closeAction')"
          :tooltip="coreString('closeAction')"
          @click="$emit('close')"
        />
      </div>

      <div class="onboarding-tooltip-body">
        <p id="tooltip-title">{{ steps[currentStepIndex].content() }}</p>
      </div>

      <div class="onboarding-tooltip-footer">
        <KButton
          v-if="currentStepIndex > 0"
          ref="backButton"
          data-back-btn="backButton"
          :primary="false"
          appearance="flat-button"
          @click="$emit('back')"
        >
          {{ coreString('backAction') }}
        </KButton>

        <KButton
          ref="continueButton"
          data-continue-btn="continueButton"
          secondary
          :text="
            currentStepIndex === steps.length - 1
              ? coreString('finishAction')
              : coreString('continueAction')
          "
          @click="$emit('next')"
        />
      </div>
    </div>
  </KFocusTrap>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { kolibriOnboardingGuideStrings } from 'kolibri/uiText/kolibriOnboardingGuideStrings';

  export default {
    name: 'TooltipContent',
    mixins: [commonCoreStrings],
    setup() {
      const { onboardingStepDescription$ } = kolibriOnboardingGuideStrings;
      return {
        onboardingStepDescription$,
      };
    },
    props: {
      page: {
        type: String,
        required: true,
      },
      steps: {
        type: Array,
        default: () => [],
      },
      currentStepIndex: {
        type: Number,
        default: 0,
      },
    },
    mounted() {
      this.$nextTick(() => {
        const btn = this.$refs.closeButton?.$el;
        if (btn && typeof btn.focus === 'function') {
          btn.focus();
        }
      });
    },
    methods: {
      focusFirstEl() {
        this.$refs.closeButton?.$el.focus();
      },
      focusLastEl() {
        this.$refs.continueButton?.$el.focus();
      },
      getTranslatedPageLabel() {
        return this.page ? this.coreString(this.page) : this.page;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .onboarding-tooltip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .onboarding-tooltip-progress {
      display: flex;
      gap: 8px;

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
    }
  }

  .onboarding-tooltip-body {
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.5;
  }

  .onboarding-tooltip-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 16px;
  }

</style>
