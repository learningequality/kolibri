<template>

  <UiIconButton
    class="previous-button"
    :class="{'previous-button-white': color === 'white'}"
    :ariaLabel="$tr('goToPreviousPage')"
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

  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'PreviousButton',
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
    svg {
      border-color: white;
      fill: white;
    }
  }

</style>
