<template>

  <KCircularLoader
    :delay="false"
  />

</template>


<script>

  import KCircularLoader from '../loaders/KCircularLoader';

  export default {
    name: 'ContentRendererLoading',
    components: {
      KCircularLoader,
    },
  };

</script>
