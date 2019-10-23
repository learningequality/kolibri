<template>

  <div class="snackbar" :style="{ backgroundColor: $themePalette.grey.v_100 }">
    <div class="table">
      <div class="row">
        <div class="icon-container cell">
          <slot name="icon"></slot>
        </div>
        <div class="content-container cell">
          <slot name="content"></slot>
        </div>
        <div class="close-container cell">
          <UiIconButton
            size="small"
            :ariaLabel="coreString('closeAction')"
            @click="$emit('close')"
          >
            <mat-svg name="close" category="navigation" />
          </UiIconButton>
        </div>
      </div>
    </div>
    <slot name="alert"></slot>
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'Snackbar',
    components: {
      UiIconButton,
    },
    mixins: [commonCoreStrings],
    $trs: {},
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .snackbar {
    @extend %dropshadow-12dp;

    position: fixed;
    right: 8px;
    bottom: 8px;
    z-index: 24;
    width: 304px;
    padding: 8px;
    font-size: 14px;
    animation-duration: 0.3s;
    animation-timing-function: ease;
    animation-fill-mode: both;
  }

  .table {
    display: table;
  }

  .row {
    display: table-row;
  }

  .cell {
    display: table-cell;
    vertical-align: middle;
  }

  .content-container {
    width: 99%;
    padding: 0 16px;
  }

</style>
