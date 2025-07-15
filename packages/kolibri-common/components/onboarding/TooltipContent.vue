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
  data() {
  return {
    hasTabbedOnce: false,
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
      const btn = this.$refs.continueButton?.$el;
      if (btn && typeof btn.focus === 'function') {
        btn.focus();
      }
    }, 0);
  });

  const closeBtn = this.$refs.closeButton?.$el;

  const backBtn = this.$refs.backButton?.$el;
  const continueBtn = this.$refs.continueButton?.$el;

  const focusOrder = [continueBtn,closeBtn,backBtn].filter(Boolean);
  this.focusTrapHandler = (e) => {
    if (e.key !== 'Tab' && e.key !== 'Escape') return;

    const activeElement = document.activeElement;
    let idx = focusOrder.indexOf(activeElement);

    if (e.key === 'Tab') {
     if (!this.hasTabbedOnce && this.currentStepIndex==0) {   
        this.hasTabbedOnce=true;
        return;
      }

      e.preventDefault();
      if (e.shiftKey) {
        // SHIFT + TAB => move focus backwards
        idx = idx <= 0 ? focusOrder.length - 1 : idx - 1;
        focusOrder[idx].focus();
      } else {
       
        idx = idx === focusOrder.length - 1 ? 0 : idx + 1;
        console.log("idx inside else:",idx);
        console.log(focusOrder[idx]);
        focusOrder[idx].focus();
      }
      
    } else if (e.key === 'Escape') {
      this.$emit('close');
    }
  };

  this.$el.addEventListener('keydown', this.focusTrapHandler);
},


    beforeDestroy() {
      this.$el.removeEventListener('keydown', this.focusTrapHandler);
    },

    methods: {
      focusFirstEl() {
       
        (this.$refs.continueButton?.$el || this.$refs.continueButton)?.focus?.();
        
       
      },
      focusLastEl() {
        const last = this.$refs.closeButton;
        (last?.$el || last)?.focus?.();
      },
    },
  };

</script>
