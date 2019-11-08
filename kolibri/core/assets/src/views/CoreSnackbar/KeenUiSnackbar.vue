<template>

  <!--
   This component was forked from the Keen library in order to handle
   dynamic styling of the action button.

   The formatting has been changed to match our linters. We may eventually
   want to simply consolidate it with our component and remove any unused
   functionality.
  -->

  <div class="ui-snackbar" @click="onClick">
    <div
      class="ui-snackbar-message"
      :style="{color: $themeTokens.textInverted}"
    >
      <slot>{{ message }}</slot>
    </div>

    <div class="ui-snackbar-action">
      <button
        v-if="action"
        class="ui-snackbar-action-button"
        :style="{ color: $themeTokens.textInverted }"
        @click.stop="onActionClick"
      >
        {{ action }}
      </button>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'KeenUiSnackbar',
    props: {
      message: String,
      action: String,
    },

    methods: {
      onClick() {
        this.$emit('click');
      },

      onActionClick() {
        this.$emit('action-click');
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  @import '~keen-ui/src/styles/imports';

  $ui-snackbar-background-color: #323232 !default;
  $ui-snackbar-font-size: rem-calc(14px) !default;

  .ui-snackbar {
    @include font-family-noto;

    display: inline-flex;
    align-items: center;
    /* stylelint-disable csstree/validator */
    min-width: rem-calc(288px);
    max-width: rem-calc(568px);
    min-height: rem-calc(48px);
    padding: rem-calc(14px 24px);
    /* stylelint-enable */
    background-color: $ui-snackbar-background-color;
    border-radius: $ui-default-border-radius;
    /* stylelint-disable csstree/validator */
    box-shadow: 0 1px 3px rgba(black, 0.12), 0 1px 2px rgba(black, 0.24);
    /* stylelint-enable */
  }

  .ui-snackbar-message {
    flex-grow: 1;
    font-size: $ui-snackbar-font-size;
    line-height: 1.5;
    cursor: default;
  }

  .ui-snackbar-action {
    /* stylelint-disable csstree/validator */
    padding-left: rem-calc(48px);
    margin: rem-calc(-9px -12px);
    /* stylelint-enable */
    margin-left: auto;
  }

  .ui-snackbar-action-button {
    @include font-family-noto;

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: initial;
    /* stylelint-disable csstree/validator */
    min-width: rem-calc(80px);
    height: $ui-button-height;
    min-height: initial;
    padding: rem-calc(12px);
    padding: 0;
    padding-right: rem-calc(16px);
    padding-left: rem-calc(16px);
    /* stylelint-enable */
    margin: 0;
    overflow: hidden;
    font-size: $ui-button-font-size;
    font-weight: bold;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    touch-action: manipulation; // IE
    cursor: pointer;
    background: none;
    border: 0;
    border-radius: $ui-default-border-radius;
    outline: none;
    &:hover {
      background-color: lighten($ui-snackbar-background-color, 5%);
    }
    &:focus body[modality='keyboard'] {
      background-color: lighten($ui-snackbar-background-color, 10%);
    }
  }

  .ui-snackbar--transition-slide-enter-active,
  .ui-snackbar--transition-slide-leave-active {
    transition: transform 0.4s ease;
  }

  .ui-snackbar--transition-slide-enter,
  .ui-snackbar--transition-slide-leave-active {
    transform: translateY(rem-calc(84px)); // stylelint-disable-line csstree/validator
  }

  .ui-snackbar--transition-fade-enter-active,
  .ui-snackbar--transition-fade-leave-active {
    transition: opacity 0.4s ease;
  }

  .ui-snackbar--transition-fade-enter,
  .ui-snackbar--transition-fade-leave-active {
    opacity: 0;
  }

</style>
