<template>

  <div>
    <h1 class="onboarding-form-header">
      {{ header }}
    </h1>

    <form @submit.prevent="$emit('submit')">
      <fieldset class="onboarding-form-fields">
        <legend class="onboarding-form-legend">
          <span
            v-if="hasDescription"
            class="onboardng-form-description"
          >
            <slot name="description">{{ description }}</slot>
          </span>
          <span
            v-else
            class="visuallyhidden"
          >{{ header }}</span>
        </legend>

        <slot></slot>
      </fieldset>

      <div class="form-footer">
        <slot name="footer"></slot>
      </div>

      <slot name="buttons">
        <KButtonGroup>
          <KButton
            class="onboarding-form-submit"
            :primary="true"
            type="submit"
            :text="submitText || coreString('continueAction')"
            :disabled="$attrs.disabled"
          />

          <KButton
            v-if="finishButton"
            :text="coreString('finishAction')"
            @click="$emit('click_finish')"
          />
        </KButtonGroup>
      </slot>
    </form>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'OnboardingForm',
    mixins: [commonCoreStrings],
    props: {
      header: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        default: null,
      },
      submitText: {
        type: String,
        default: null,
      },
      finishButton: {
        type: Boolean,
        default: false,
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
    min-width: 0;
    padding: 0;
    margin: 0;
    margin-bottom: 24px;
    border: 0;
  }

  .onboarding-form-header {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 21px;
  }

  .onboarding-form-legend {
    // Fixes issue in IE11 where the description span would not be broken up
    width: 100%;
    margin-bottom: 8px;
  }

  .onboarding-form-description {
    margin-bottom: 8px;
  }

  .form-footer {
    margin: 24px 0;
    margin-top: 24px;
  }

  /deep/ .truncate-text {
    // Ensure long text (like German) wrap and stay on screen
    white-space: normal;
  }

</style>
