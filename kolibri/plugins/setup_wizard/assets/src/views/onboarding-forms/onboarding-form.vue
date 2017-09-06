<template>

  <form @submit="$emit('submit')">
    <fieldset class="onboarding-form-fieldset">
      <legend>
        <h1 class="onboarding-form-header">
          {{ header }}
        </h1>
      </legend>

      <slot />
    </fieldset>

    <k-button
      class="onboarding-form-submit"
      :primary="true"
      type="submit"
      :text="submitText"
    />
  </form>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'onboardingForm',
    props: {
      header: {
        type: String,
        required: true,
      },
      submitText: {
        type: String,
        required: true,
      },
    },
    components: {
      kButton,
    },
  };

</script>


<style scoped lang="stylus">

  .onboarding-form
    &-fieldset
      border: none
      padding: 0
      margin: 0
      margin-bottom: 40px

    &-header
      margin-bottom: 24px

    &-submit
      margin: 0

</style>