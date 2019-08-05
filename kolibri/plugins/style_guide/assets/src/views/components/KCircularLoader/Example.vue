<template>

  <div>
    <KCircularLoader :delay="false" />
  </div>

</template>


<script>

  import KCircularLoader from 'kolibri.shared.KCircularLoader';

  export default {
    name: 'KCircularLoaderExample',
    components: { KCircularLoader },
  };

</script>
