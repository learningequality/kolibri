<template>

  <div class="snackbar table">
    <div class="row">
      <div class="icon-container cell">
        <slot name="icon"></slot>
      </div>
      <div class="content-container cell">
        <ui-alert
          v-if="!isUserLoggedIn"
          :dismissible="false"
          type="warning"
        >
          {{ $tr('signIn') }}
        </ui-alert>
        <slot name="content"></slot>
      </div>
      <div class="close-container cell">
        <ui-icon-button
          size="small"
          icon="close"
          :ariaLabel="$tr('close')"
          @click="$emit('close')"
        />
      </div>
    </div>
  </div>

</template>


<script>

  import UiIconButton from 'keen-ui/src/UiIconButton';
  import uiAlert from 'keen-ui/src/UiAlert';

  export default {
    name: 'snackbar',
    $trs: {
      close: 'Close',
      signIn: 'Sign in or create an account to save points you earn',
    },
    components: {
      UiIconButton,
      uiAlert,
    },
    props: {
      isUserLoggedIn: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .snackbar
    position: fixed
    bottom: 8px
    right: 8px
    width: 304px
    z-index: 24
    padding: 8px
    background-color: $core-bg-canvas
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2),
                0 4px 5px 0 rgba(0, 0, 0, 0.14),
                0 1px 10px 0 rgba(0, 0, 0, 0.12)
    animation-fill-mode: both
    animation-timing-function: cubic-bezier(0.35, 0, 0.25, 1)
    animation-duration: 0.3s
    font-size: 14px

  .table
    display: table

  .row
    display: table-row

  .cell
    display: table-cell
    vertical-align: middle

  .content-container
    width: 99%
    padding: 0 16px

</style>
