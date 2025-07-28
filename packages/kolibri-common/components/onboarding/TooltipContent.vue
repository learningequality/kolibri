<template>

  <div class="onboarding-tooltip">
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
      <p>{{ steps[currentStepIndex].content }}</p>
    </div>
    <div class="onboarding-tooltip-footer">
      <KButton
        v-if="currentStepIndex > 0"
        :primary="false"
        appearance="flat-button"
        @click="$emit('back')"
      >
        Back
      </KButton>
      <KButton
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

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'TooltipContent',
    mixins: [commonCoreStrings],
    props: {
      steps: {
        type: Array,
        default: () => [],
      },
      currentStepIndex: {
        type: Number,
        default: 0,
      },
    },
  };

</script>
