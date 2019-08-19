<template>

  <UiAlert :dismissible="false" type="error">
    {{ $tr('rendererNotAvailable') }}
  </UiAlert>

</template>


<script>

  import UiAlert from 'keen-ui/src/UiAlert';

  export default {
    name: 'ContentRendererError',
    components: {
      UiAlert,
    },
    $trs: {
      rendererNotAvailable: 'Kolibri is unable to render this content',
    },
  };

</script>
