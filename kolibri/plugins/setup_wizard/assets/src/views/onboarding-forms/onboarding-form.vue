<template>

  <div>
    <h1 class="onboarding-form-header">
      {{ header }}
    </h1>

    <form @submit.prevent="$emit('submit')">
      <fieldset class="onboarding-form-fields">
        <legend class="onboarding-form-legend">
          <span v-if="details" class="onboardng-form-details"> {{ details }} </span>
          <span v-else class="visuallyhidden"> {{ header }} </span>
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
  </div>

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
      details: {
        type: String,
        required: false,
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

  @require '~kolibri.styles.definitions'

  $core-title-md = 21px // filling in for future typography styles

  .onboarding-form
    &-fields
      border: none
      padding: 0
      margin: 0
      margin-bottom: 40px

    &-header
      margin-top: 0
      margin-bottom: 16px
      font-size: $core-title-md

    &-legend
      margin-bottom: 8px

    &-details
      margin-bottom: 8px

    &-submit
      margin: 0

</style>