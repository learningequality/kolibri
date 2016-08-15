<template>

  <nav class="nav" role="navigation" :aria-label="youAreHere">
    <span class="parent">
      <a v-link="rootLink">{{ $tr('explore') }}</a>
    </span>
    <span class="parent" v-for="crumb in crumbs">
      <a v-link="crumbLink(crumb.id)">{{ crumb.title }}</a>
    </span>
    <span class="current">
      <span class="visuallyhidden">{{ $tr('current') }} </span>
        <!-- TODO: Get current topic title -->
    </span>
  </nav>

</template>


<script>

  const PageNames = require('../../state/constants').PageNames;

  module.exports = {
    $trNameSpace: 'learn',
    $trs: {
      explore: 'Explore',
      youAreHere: 'You are here:',
      current: 'Current:',
    },
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
        return { name: PageNames.EXPLORE_CHANNEL };
      },
      youAreHere() {
        return this.$tr('youAreHere');
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

  .nav
    margin-top: 2em
    margin-bottom:1.4em

  .parent a:link
    font-weight: 300

  span.parent::after
    content: '»'
    margin-left: 0.5em
    margin-right: 0.5em

</style>
