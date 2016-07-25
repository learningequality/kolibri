<template>

  <nav role="navigation" aria-label="Breadcrumbs navigation">
    <span class="parent">
      <a v-link="rootLink">Explore</a> <span class='sep'>»</span>
    </span>
    <span class="parent" v-for="crumb in crumbs">
      <a v-link="crumbLink(crumb.id)">{{ crumb.title }}</a> <span class='sep'>»</span>
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

  .sep
    margin-left: 0.5em
    margin-right: 0.5em

</style>
