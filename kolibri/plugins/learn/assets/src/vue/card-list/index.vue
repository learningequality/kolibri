<template>

  <div>
    <h3 v-if="header">{{header}}</h3>
    <div class="card-list">
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


<style lang="stylus">

  @require '../learn.styl'

  // @stylint off
  .card-list > *
  // @stylint on
    margin-bottom: $card-gutter

</style>


<style lang="stylus" scoped></style>
