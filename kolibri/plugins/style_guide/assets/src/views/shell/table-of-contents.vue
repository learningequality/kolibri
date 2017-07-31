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

  import map from 'lodash/map';

  /**
   * A component for auto-generating a table of contents for a page. All
   * elements with an [id] attribute defined will be shown in the TOC.
   */
  export default {
    name: 'TableOfContents',
    data() {
      return {
        // These are all the anchors to show in the TOC.
        // They are objects with the "hash" and "label" properties.
        anchors: [],
      };
    },
    mounted() {
      this.anchors = map(this.$parent.$el.querySelectorAll('[id]'), sectionHeadingEl => ({
        hash: `#${sectionHeadingEl.id}`,
        label: sectionHeadingEl.innerText,
      }));
    },
    methods: {
      getAnchorLink(hash) {
        return this.$route.path + hash; // E.g. /style_guide/foo#bar
      },
    },
  };

</script>


<style lang="stylus" scoped>

  ul
    padding-left: 0
    list-style-type: none

    a
      text-decoration: none

</style>
