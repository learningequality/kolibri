<template>

  <div>
    <KCircularLoader :delay="false" />
  </div>

</template>


<script>

  import KCircularLoader from 'kolibri-components/src/loaders/KCircularLoader';

  export default {
    name: 'Example',
    components: { KCircularLoader },
  };

</script>
