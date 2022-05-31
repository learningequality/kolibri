<template>

  <router-view />

</template>


<script>

  /* TODO Probably going to just remove this... */
  export default {
    name: 'UngroupedSetupSteps',
    inject: ['wizardService'],
  };

</script>


<style lang="scss" scoped>

  .main {
    margin: 16px;
  }

</style>
