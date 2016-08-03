<template>

  <nav-bar>
    <slot name="nav"></slot>
  </nav-bar>

  <div>
    <slot name="content"></slot>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'nav-bar': require('./nav-bar'),
    },
  };

</script>


<style lang="stylus" scoped></style>
