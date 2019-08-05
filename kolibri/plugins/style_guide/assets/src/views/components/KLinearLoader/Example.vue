<template>

  <div>
    <p>
      <KLinearLoader :delay="false" type="indeterminate" />
    </p>
    <p>
      <KLinearLoader :delay="false" type="determinate" :progress="progress" />
    </p>
  </div>

</template>


<script>

  import KLinearLoader from 'kolibri.coreVue.components.KLinearLoader';

  export default {
    name: 'KLinearLoaderExample',
    components: { KLinearLoader },
    data: () => ({
      progress: 50,
    }),
  };

</script>
