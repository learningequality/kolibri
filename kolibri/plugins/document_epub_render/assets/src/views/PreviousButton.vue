<template>

  <UiIconButton
    class="previous-button"
    type="secondary"
    :disableRipple="true"
    @click="$emit('goToPreviousPage')"
  >
    <mat-svg
      v-if="isRtl"
      name="chevron_right"
      category="navigation"
    />
    <mat-svg
      v-else
      name="chevron_left"
      category="navigation"
    />
  </UiIconButton>

</template>


<script>

  import UiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'PreviousButton',
    components: {
      UiIconButton,
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .previous-button {
    @include navigation-button;

    text-align: left;
  }

</style>
