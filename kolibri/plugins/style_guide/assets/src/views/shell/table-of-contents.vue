<template>

  <ul>
    <li v-for="anchor in anchors">
      <a :href="route" @click="goToAnchor(anchor.hash)">
        {{ anchor.label }}
      </a>
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
        route: ''
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
      // Uses the provided hash (e.g. "#heading") as the ID to find the element
      // with anchor behavior, and scrolls it into view.
      goToAnchor(hash) {
        // Notes: scrollIntoView() may not be available in older browsers.
        document.querySelector(hash).scrollIntoView();
      }
    },
  };

</script>


<style lang="stylus" scoped>

  ul
    list-style-type: none

</style>
