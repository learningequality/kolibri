<template>

  <fieldset class="onboarding-form-fields">
    <legend v-if="hasDescription || header" class="onboarding-form-legend">
      <span v-if="hasDescription" class="onboardng-form-description">
        <slot name="description">{{ description }}</slot>
      </span>
      <span v-else class="visuallyhidden">{{ header }}</span>
    </legend>

    <slot></slot>
  </fieldset>

</template>


<script>

  export default {
    name: 'OnboardingFormFieldset',
    props: {
      header: {
        type: String,
        required: false,
      },
      description: {
        type: String,
        required: false,
      },
    },
    computed: {
      hasDescription() {
        return this.description || this.$slots.description;
      },
    },
  };

</script>


<style lang="scss" scoped>

  .onboarding-form-fields {
    padding: 0;
    margin: 0;
    margin-bottom: 24px;
    border: 0;
  }

  .onboarding-form-legend {
    // Fixes issue in IE11 where the description span would not be broken up
    width: 100%;
    margin-bottom: 8px;
  }

  .onboarding-form-description {
    margin-bottom: 8px;
  }

</style>
