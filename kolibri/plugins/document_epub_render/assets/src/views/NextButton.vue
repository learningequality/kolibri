<template>

  <UiIconButton
    class="next-button"
    :class="{'next-button-white': color === 'white'}"
    :ariaLabel="$tr('goToNextPage')"
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

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'NextButton',
    components: {
      UiIconButton,
    },
    props: {
      // TODO - refactor to use themes properly
      color: {
        type: String,
        required: true,
        validator(val) {
          return ['black', 'white'].includes(val);
        },
      },
      isRtl: {
        type: Boolean,
        required: true,
      },
    },
    $trs: {
      goToNextPage: 'Go to next page',
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .next-button {
    @include navigation-button;
  }

  .next-button-white {
    svg {
      border-color: white;
      fill: white;
    }
  }

</style>
