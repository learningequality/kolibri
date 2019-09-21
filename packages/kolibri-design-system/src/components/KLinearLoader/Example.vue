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

  export default {
    name: 'Example',
    data: () => ({
      progress: 50,
    }),
  };

</script>
