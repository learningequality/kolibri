<template>

  <nav role="navigation" aria-label="Breadcrumbs navigation">
    <span class="parent">
      <a v-link="rootLink">All</a> /
    </span>
    <span class="parent" v-for="crumb in crumbs">
      <a v-link="crumbLink(crumb.id)">{{ crumb.title }} </a> /
    </span>
    <span class="child">
      {{ current | capitalize }}
    </span>
  </nav>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;

  module.exports = {
    props: {
      rootid: {
        type: String,
        required: true,
      },
      crumbs: {
        type: Array,
        required: true,
      },
      current: {
        type: String,
        required: true,
      },
    },
    computed: {
      rootLink() {
        return { name: PageNames.EXPLORE_ROOT };
      },
    },
    methods: {
      crumbLink(id) {
        return {
          name: PageNames.EXPLORE_TOPIC,
          params: { id },
        };
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .parent , a
    color: $core-text-annotation

  .child
    color: $core-text-default
    font-weight: 700

</style>
