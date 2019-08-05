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

  import KLinearLoader from 'kolibri.shared.KLinearLoader';

  export default {
    name: 'Example',
    components: { KLinearLoader },
    data: () => ({
      progress: 50,
    }),
  };

</script>
