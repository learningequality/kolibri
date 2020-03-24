<template>

  <UiIconButton
    class="next-button"
    :class="{ 'next-button-white': color === 'white' }"
    :ariaLabel="$tr('goToNextPage')"
    @click="$emit('goToNextPage')"
  >
    <KIcon
      v-if="!isRtl"
      icon="keyboard_arrow_right"
      :style="{ top: 0, height: '24px', width: '24px' }"
    />
    <KIcon
      v-else
      icon="keyboard_arrow_left"
      :style="{ top: 0, height: '24px', width: '24px' }"
    />
  </UiIconButton>

</template>


<script>

  import UiIconButton from 'kolibri-design-system/lib/keen/UiIconButton';

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
