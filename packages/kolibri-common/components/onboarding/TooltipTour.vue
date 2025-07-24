<template>

  <div>
    <div
      v-if="showOverlay"
      class="overlay"
      aria-hidden="true"
      tabindex="-1"
      @click.stop
    ></div>
    <div
      class="spotlight-highlight"
      :style="highlightStyle"
    ></div>
    <slot></slot>
  </div>

</template>


<script>

  import tippy from 'tippy.js';
  import Vue from 'vue';
  import { onboardingSteps } from 'kolibri-common/utils/onboardingSteps.js';
  import TooltipContent from './TooltipContent.vue';

  export default {
    name: 'TooltipTour',
    props: {
      pageTitle: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        currentStepIndex: 0,
        tippyInstance: null,
        showOverlay: false,
        rect: {},
      };
    },
    computed: {
      steps() {
        return onboardingSteps[this.pageTitle] || [];
      },
      highlightStyle() {
        return {
          position: 'fixed',
          top: `${this.rect.top}px`,
          left: `${this.rect.left}px`,
          width: `${this.rect.width}px`,
          height: `${this.rect.height}px`,
          borderRadius: '4px',
          boxShadow: '0 0 0 10000px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'none',
          zIndex: 998,
        };
      },
    },
    mounted() {
      this.showTooltip();
      window.document.documentElement.style['overflow'] = 'hidden';
    },
    destroyed() {
      window.document.documentElement.style['overflow'] = 'auto';
    },
    methods: {
      showTooltip() {
        if (this.tippyInstance) {
          this.tippyInstance.destroy();
          this.tippyInstance = null;
        }

        this.$nextTick(() => {
          const currentStep = this.steps[this.currentStepIndex];
          if (!currentStep) return;

          const target = document.querySelector(`[data-onboarding-id="${currentStep.key}"]`);

          if (!target) {
            return;
          }

          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.showOverlay = true;
          const TooltipConstructor = Vue.extend(TooltipContent);
          const instance = new TooltipConstructor({
            propsData: {
              pageTitle: this.pageTitle,
              steps: this.steps,
              currentStepIndex: this.currentStepIndex,
            },
          });

          instance.$on('next', this.nextStep);
          instance.$on('back', this.prevStep);
          instance.$on('close', this.endTour);
          instance.$mount();
          this.updateOverlay();
          window.addEventListener('scroll', this.updateOverlay, true);
          window.addEventListener('resize', this.updateOverlay);
          try {
            this.tippyInstance = tippy(target, {
              content: instance.$el,
              allowHTML: true,
              placement: 'right-start',
              interactive: true,
              trigger: 'manual',
              appendTo: document.body,
              arrow: false,
              theme: 'onboarding',
              animateFill: true,
              hideOnClick: false,
              popperOptions: {
                modifiers: {
                  offset: {
                    offset: '50, 0',
                  },
                },
              },
            });

            if (this.tippyInstance?.show) {
              this.tippyInstance.show();
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Error showing tooltip:', e);
          }
        });
      },
      updateOverlay() {
        const currentStep = this.steps[this.currentStepIndex];
        const target = document.querySelector(`[data-onboarding-id="${currentStep.key}"]`);
        if (!target) return;

        const rect = target.getBoundingClientRect();
        this.rect = rect;
      },
      nextStep() {
        if (this.currentStepIndex < this.steps.length - 1) {
          this.currentStepIndex++;
          this.showTooltip();
        } else {
          this.endTour();
        }
      },
      prevStep() {
        if (this.currentStepIndex > 0) {
          this.currentStepIndex--;
          this.showTooltip();
        }
      },
      endTour() {
        this.$emit('tourEnded');
        if (this.tippyInstance) {
          this.tippyInstance.destroy();
          this.tippyInstance = null;
        }
        this.currentStepIndex = 0;
        this.showOverlay = false;

        window.removeEventListener('scroll', this.updateOverlay, true);
        window.removeEventListener('resize', this.updateOverlay);
      },
    },
  };

</script>


<style>

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    width: 100%;
    height: 100%;
    pointer-events: auto;
    background: transparent;
  }

  .spotlight-highlight {
    position: fixed;
    pointer-events: none;
    background: transparent;
    border-radius: 4px;
  }

  .tippy-tooltip.onboarding-theme {
    z-index: 999;
    gap: 16px;
    width: 328px;
    padding: 16px;
    font-family: 'Roboto', sans-serif;
    color: #333333;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .onboarding-tooltip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .onboarding-tooltip-progress {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: #cccccc;
    border-radius: 50%;
  }

  .dot.active {
    background: #4368f5;
  }

  .onboarding-tooltip-body {
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.5;
  }

  .tippy-tooltip.onboarding-theme[data-animatefill] {
    background-color: transparent;
  }

  .tippy-tooltip.onboarding-theme .tippy-backdrop {
    background-color: white;
  }

  .onboarding-tooltip-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 16px;
  }

</style>
