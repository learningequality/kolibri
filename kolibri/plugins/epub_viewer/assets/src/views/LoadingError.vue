<template>

  <div
    class="epub-renderer-error"
    :class="{loaded}"
    :style="{background: $themeTokens.surface}"
  >
    <UiAlert
      type="error"
      :dismissible="false"
    >
      {{ $tr('couldNotLoadThisBook') }}
    </UiAlert>
  </div>

</template>


<script>

  import UiAlert from 'kolibri.coreVue.components.UiAlert';

  export default {
    name: 'LoadingError',
    components: {
      UiAlert,
    },
    props: {
      loaded: {
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      couldNotLoadThisBook: 'Could not load this book',
    },
  };

</script>


<style lang="scss" scoped>

  .epub-renderer-error {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 3;
  }

  .epub-renderer-error.loaded {
    top: 36px;
    bottom: auto;
    z-index: 0;
    background: transparent;
  }

</style>
