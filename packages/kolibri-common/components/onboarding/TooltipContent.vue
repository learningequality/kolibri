<template>
  <KFocusTrap
    @shouldFocusFirstEl="focusFirstEl"
  >
    <div
      class="onboarding-tooltip"
      role="dialog"
      aria-modal="true"
    >
      <h1 class="visuallyhidden">
        {{
          onboardingStepDescription$({
            pageTitle: page,
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
            :class="['dot', { active: index === currentStepIndex }]"
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
        <p id="tooltip-title">{{ steps[currentStepIndex].content }}</p>
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
          Back
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
  import { kolibriOnboardingGuideStrings } from 'kolibri-common/strings/kolibriOnboardingGuideStrings';

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
      page: String,
      steps: Array,
      currentStepIndex: Number,
    },
    mounted() {
      this.$nextTick(() => {
        setTimeout(() => {
          const btn = this.currentStepIndex==0?this.$refs.closeButton?.$el:this.$refs.continueButton?.$el;
          if (btn && typeof btn.focus === 'function') {
            btn.focus();
          }
        }, 0);
      });
    },
    methods: {
      focusFirstEl() {
        (this.$refs.closeButton?.$el || this.$refs.closeButton)?.focus?.();
      },
    },
  };

</script>
