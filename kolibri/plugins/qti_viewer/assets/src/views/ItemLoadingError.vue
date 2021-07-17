<template>

  <KLabeledIcon :label="$tr('error')" icon="error" />

</template>


<script>

  export default {
    name: 'ItemLoadingError',
    $trs: {
      error: {
        message: 'Kolibri is unable to load this question, try refreshing',
        context:
          '\nThis message is displayed when Kolibri is unable to properly load or display the request question in QTI, this is probably a network issue.',
      },
    },
  };

</script>
