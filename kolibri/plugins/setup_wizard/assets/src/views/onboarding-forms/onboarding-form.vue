<template>

  <div>
    <h1 class="onboarding-form-header">
      {{ header }}
    </h1>

    <form @submit.prevent="$emit('submit')">
      <fieldset class="onboarding-form-fields">
        <legend class="onboarding-form-legend">
          <span v-if="hasDescription" class="onboardng-form-description">
            <slot name="description">{{ description }}</slot>
          </span>
          <span v-else class="visuallyhidden">{{ header }}</span>
        </legend>

        <slot></slot>
      </fieldset>

      <k-button
        class="onboarding-form-submit"
        :primary="true"
        type="submit"
        :text="submitText"
      />
    </form>
    <div class="form-footer">
      <slot name="footer"></slot>
    </div>
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'onboardingForm',
    components: {
      kButton,
    },
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
    computed: {
      hasDescription() {
        return this.description || this.$slots.description;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  $core-title-md: 21px; // filling in for future typography styles

  .onboarding-form {
    &-fields {
      padding: 0;
      margin: 0;
      margin-bottom: 24px;
      border: 0;
    }

    &-header {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: $core-title-md;
    }

    &-legend {
      margin-bottom: 8px;
    }

    &-description {
      margin-bottom: 8px;
    }

    &-submit {
      margin: 0;
    }
  }

  .form-footer {
    margin-top: 24px;
  }

</style>
