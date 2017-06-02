<template>

  <div>
    <div class="title">
      <h2 v-if="title">{{title}}</h2>
      <slot name="titlebox"/>
    </div>
    <component :contents="contents" :is="container">
      <slot/>
    </component>
  </div>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
      },
      container: {
        type: String,
        default: 'grid',
      },
      contents: {
        type: Array,
        validator(contents) {
          return contents.length;
        },
      },
    },
    components: {
      carousel: require('./content-carousel'),
      grid: require('./content-grid'),
      list: require('./content-list'),
    },
  };

</script>


<style lang="stylus" scoped>

  .title
    margin-top: 2em
    margin-bottom: 1.4em

  .title h2
    display: inline

</style>
