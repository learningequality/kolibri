<template>

  <core-base>

    <p>
      <!-- use v-link directive for navigation. -->
      <a v-link="{ path: '/foo' }">Go to Foo</a>
      <a v-link="{ path: '/bar' }">Go to Bar</a>
    </p>

    <router-view></router-view>

    <topic-page></topic-page>

  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'topic-page': require('./topic-page'),
    },
  };

</script>


<style lang="stylus" scoped></style>
