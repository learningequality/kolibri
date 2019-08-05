<template>

  <div>
    <KCircularLoader :delay="false" />
  </div>

</template>


<script>

  import KCircularLoader from 'kolibri.shared.KCircularLoader';

  export default {
    name: 'Example',
    components: { KCircularLoader },
  };

</script>
