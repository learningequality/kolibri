<template>

  <div>
    <div class="header">
      <h2 v-if="header">{{header}}</h2>
      <slot name="headerbox"/>
    </div>
    <div class="pure-g">
      <slot/>
    </div>
  </div>

</template>


<script>

  module.exports = {
    props: [
      'header',
    ],
  };

</script>


<style lang="stylus" scoped>

  .header
    margin-top: 2em
    margin-bottom: 1.4em

  .header h2
    display: inline

</style>
