<template>

  <UiAlert
    type="error"
    :dismissible="false"
  >
    {{ $tr('couldNotLoadThisBook') }}
  </UiAlert>

</template>


<script>

  import UiAlert from 'kolibri.coreVue.components.UiAlert';

  export default {
    name: 'LoadingError',
    $trs: {
      couldNotLoadThisBook: 'Could not load this book',
    },
    components: {
      UiAlert,
    },
  };

</script>


<style lang="scss" scoped></style>
