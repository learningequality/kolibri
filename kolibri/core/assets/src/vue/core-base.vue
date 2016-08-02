<template>

  <side-nav></side-nav>

  <div>
    <slot></slot>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'side-nav': require('./side-nav'),
    },
  };

</script>


<style lang="stylus" scoped></style>
