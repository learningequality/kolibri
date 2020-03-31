<template>

  <KIconButton
    :icon="isRtl ? 'keyboard_arrow_right' : 'keyboard_arrow_left'"
    class="previous-button"
    :class="{ 'previous-button-white': color === 'white' }"
    :color="color"
    :ariaLabel="$tr('goToPreviousPage')"
    @click="$emit('goToPreviousPage')"
  />

</template>


<script>

  export default {
    name: 'PreviousButton',
    props: {
      // TODO - refactor to use themes properly
      color: {
        type: String,
        required: true,
        validator(val) {
          return ['black', 'white'].includes(val);
        },
      },
    },
    $trs: {
      goToPreviousPage: 'Go to previous page',
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .previous-button {
    @include navigation-button;
  }

  .previous-button-white {
    /deep/ svg {
      border-color: white;
      fill: white;
    }
  }

</style>
