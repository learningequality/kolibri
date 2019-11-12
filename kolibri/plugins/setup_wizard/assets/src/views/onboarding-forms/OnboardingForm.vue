<template>

  <div>
    <h1 class="onboarding-form-header">
      {{ header }}
    </h1>

    <form @submit.prevent="$emit('submit')">
      <OnboardingFormFieldset :header="header" :description="description">
        <slot></slot>
      </OnboardingFormFieldset>

      <slot name="additional-fields"></slot>

      <div class="form-footer">
        <slot name="footer"></slot>
      </div>

      <KButton
        class="onboarding-form-submit"
        :primary="true"
        type="submit"
        :text="submitText"
      />
    </form>
  </div>

</template>


<script>

  import OnboardingFormFieldset from './OnboardingFormFieldset';

  export default {
    name: 'OnboardingForm',
    components: { OnboardingFormFieldset },
    props: {
      header: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: false,
      },
      submitText: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .onboarding-form-header {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 21px;
  }

  .onboarding-form-submit {
    margin: 0;
  }

  .form-footer {
    margin: 24px 0;
    margin-top: 24px;
  }

</style>
