<template>

  <UiIconButton
    class="previous-button"
    :class="{ 'previous-button-white': color === 'white' }"
    :ariaLabel="$tr('goToPreviousPage')"
    @click="$emit('goToPreviousPage')"
  >
    <KIcon
      v-if="!isRtl"
      icon="keyboard_arrow_left"
      :style="{ top: 0, height: '24px', width: '24px' }"
    />
    <KIcon
      v-else
      icon="keyboard_arrow_right"
      :style="{ top: 0, height: '24px', width: '24px' }"
    />
  </UiIconButton>

</template>


<script>

  import UiIconButton from 'kolibri-design-system/lib/keen/UiIconButton';

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
