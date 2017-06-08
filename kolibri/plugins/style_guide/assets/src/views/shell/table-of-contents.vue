<template>

  <ul>
    <li v-for="anchor in anchors">
      <router-link :to="getAnchorLink(anchor.hash)">
        {{ anchor.label }}
      </router-link>
    </li>
  </ul>

</template>


<script>

  /**
   * A component for auto-generating a table of contents for a page. All
   * elements with an [id] attribute defined will be shown in the TOC.
   */

  const map = require('lodash/map');

  module.exports = {
    name: 'TableOfContents',
    data() {
      return {
        // These are all the anchors to show in the TOC.
        // They are objects with the "hash" and "label" properties.
        anchors: [],
      };
    },
    mounted() {
      this.route = this.$route.path.replace('/', '#');

      this.anchors = map(
        this.$parent.$el.querySelectorAll('[id]'),
        (sectionHeadingEl) => ({
          hash: `#${sectionHeadingEl.id}`,
          label: sectionHeadingEl.innerText
        }));
    },
    methods: {
      getAnchorLink(hash) {
        return this.$route.path + hash;
      },
    },
  };

</script>


<style lang="stylus" scoped>

  ul
    list-style-type: none

</style>
