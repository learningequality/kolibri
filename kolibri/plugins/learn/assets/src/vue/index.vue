<template>

  <core-base>

    <nav id="learn-nav">
      <a v-link="{ path: '/', exact: true }">Home</a> |
      <a v-link="{ path: '/topics', exact: true }">Topic Page</a> |
      <a v-link="{ path: '/recommendations', exact: true }">Recommendation Page</a> |
      <a v-link="{ path: '/content', exact: true }">Content Page</a>
    </nav>

    <router-view></router-view>

  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
    },
    created() {
      this.$router.map({
        '/topics': {
          component: require('./topic-page'),
        },
        '/recommendations': {
          component: require('./recs-page'),
        },
        '/content': {
          component: require('./content-page'),
        },
      });
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  #learn-nav
    text-align: center
    font-weight: bold

  // this class is automatically added to links with the v-link directive
  .v-link-active
    cursor: default
    color: $core-text-annotation


</style>
