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
      rendererNotAvailable: {
        message: 'Kolibri is unable to render this resource',
        context:
          '\nThis message is displayed when Kolibri is unable to properly load or display the requested resource (could be either server loading error, or something wrong with the resource format itself).',
      },
    },
  };

</script>
