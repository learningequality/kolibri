<template>

  <div>
    <h2 v-if="header">{{header}}</h2>
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


<style lang="stylus" scoped></style>
