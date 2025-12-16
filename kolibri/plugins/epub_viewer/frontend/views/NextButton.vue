<template>

  <KIconButton
    :icon="isRtl ? 'chevronLeft' : 'chevronRight'"
    class="next-button"
    :class="{ 'next-button-white': color === 'white' }"
    :ariaLabel="$tr('goToNextPage')"
    :color="color"
    @click="$emit('goToNextPage')"
  />

</template>


<script>

  export default {
    name: 'NextButton',
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
      goToNextPage: {
        message: 'Go to next page',
        context: 'Digital book navigation option.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './EpubStyles';

  .next-button {
    @include navigation-button;

    svg {
      border: 2px solid;
    }
  }

  .next-button-white {
    /deep/ svg {
      border-color: white;
      fill: white;
    }
  }

</style>
