<template>

  <UiIconButton
    class="previous-button"
    :class="{'previous-button-white': color === 'white'}"
    type="secondary"
    :disableRipple="false"
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

  import UiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'PreviousButton',
    $trs: {
      goToPreviousPage: 'Go to previous page',
    },
    components: {
      UiIconButton,
    },
    props: {
      color: {
        type: String,
        required: true,
        validator(val) {
          return ['black', 'white'].includes(val);
        },
      },
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
