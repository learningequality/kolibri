<template>

  <div class="epub-renderer-error">
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
    z-index: 7;
    background: #ffffff;
  }

</style>
