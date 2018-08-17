<template>

  <UiIconButton
    class="next-button"
    type="secondary"
    :disableRipple="true"
    @click="$emit('goToNextPage')"
  >
    <mat-svg
      v-if="isRtl"
      name="chevron_left"
      category="navigation"
    />
    <mat-svg
      v-else
      name="chevron_right"
      category="navigation"
    />
  </UiIconButton>

</template>


<script>

  import UiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'NextButton',
    components: {
      UiIconButton,
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .next-button {
    @include navigation-button;

    text-align: right;
  }

</style>
