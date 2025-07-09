<template>

    <div
      class="onboarding-tooltip"
      role="dialog"
      aria-modal="true"
    >
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
          class="close-button"
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
          :primary="false"
          appearance="flat-button"
          @click="$emit('back')"
        >
          Back
        </KButton>

        <KButton
          ref="continueButton"
          data-continue-btn="continueButton"
          tabindex="1"
          secondary
          @click="$emit('next')"
          :text="currentStepIndex === steps.length - 1 ? coreString('finishAction') : coreString('continueAction')"
        />
      </div>
    </div>

</template>

<script>
import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

export default {
  name: 'TooltipContent',
  mixins: [commonCoreStrings],
  props: {
    steps: Array,
    currentStepIndex: Number,
  },
 mounted() {  
  /* this.$nextTick(() => {
    setTimeout(() => {
        if(this.$refs.continueButton){
            this.$refs.continueButton.$el.focus();
         console.log("continueButton1:",  this.$refs.continueButton.$el);
        }
    }, 0);
  });*/

  this.focusTrapHandler = (e) => {
    if (e.key !== "Tab" && e.key !== "Escape") return;

    const continueBtn = this.$refs.continueButton?.$el;
    console.log("continueButton2:",continueBtn);

    const closeBtn = this.$refs.closeButton?.$el || this.$refs.closeButton;
   
    const backBtn = this.$refs.backButton?.$el || this.$refs.backButton;

    const focusOrder = [continueBtn, closeBtn];
    if (backBtn) focusOrder.push(backBtn);

    const focusable = focusOrder.filter(Boolean);
    if (!focusable.length) return;

    const activeElement = document.activeElement;
    let idx = focusable.indexOf(activeElement);

    if (e.key === "Tab") {
      e.preventDefault();
      if (idx === -1) {
        focusable[0].focus();
        return;
      }
      if (e.shiftKey) {
        idx = idx === 0 ? focusable.length - 1 : idx - 1;
      } else {
        idx = idx === focusable.length - 1 ? 0 : idx + 1;
      }
      focusable[idx].focus();
    } else if (e.key === "Escape") {
      this.$emit("close");
    }
  };

    this.$el.addEventListener("keydown", this.focusTrapHandler);
  },
  beforeDestroy() {
    this.$el.removeEventListener("keydown", this.focusTrapHandler);
  },
};
</script>
