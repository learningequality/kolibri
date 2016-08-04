<template>

  <div>

    <nav-bar>
      <slot name="nav"></slot>
    </nav-bar>

    <div>
      <slot name="content"></slot>
    </div>

    <error-box v-show='error'></error-box>

  </div>

</template>


<script>

  module.exports = {
    components: {
      'nav-bar': require('./nav-bar'),
      'error-box': require('./error-box'),
    },
  };

</script>


<style lang="stylus" scoped></style>
