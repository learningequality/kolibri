<template>

  <nav>
    <ol>
      <li v-for="(item, index) in items">
        <router-link v-if="notLastBreadcrumb(index)" to="#" class="breadcrumb-item">
          {{ item.text }}
        </router-link>
        <strong v-else class="breadcrumb-item-last" :style="{ maxWidth: `${maxWidthOfLastItem}px` }">
          {{ item.text }}
        </strong>
      </li>
    </ol>
  </nav>

</template>


<script>

  const ResponsiveElement = require('kolibri.coreVue.mixins.responsiveElement');

  module.exports = {
    mixins: [ResponsiveElement],
    $trNameSpace: 'breadcrumbs',
    props: {
      // router-link
      // title
      items: {
        type: Array,
      },
    },
    computed: {
      allItems() {
        return this.items;
      },
      avaialableWidth() {
        return this.elSize.width;
      },
      maxWidthOfLastItem() {
        return this.avaialableWidth;
      },
      remaingWidth() {

      },
      // all start within menu.
      // while there is room, push
      itemsVisible() {

      },
      itemsWithinMenu() {
        // all items - itemsvisible
      },
    },
    methods: {
      notLastBreadcrumb(index) {
        return index !== this.items.length - 1;
      },
      updateBreadcrumbs(avaialableWidth) {
        const breadcrumbItems = Array.from(this.$el.querySelectorAll('.breadcrumb-item'));
        let lastItemWidth = breadcrumbItems[breadcrumbItems.length - 1].clientWidth;
        breadcrumbItems.splice(-1, 1);
        const remainingItems = breadcrumbItems.length;
        if (remainingItems <= 0) {
          return;
        }
        const remaingWidth = avaialableWidth - lastItemWidth;
        lastItemWidth = breadcrumbItems[breadcrumbItems.length - 1].clientWidth;
        while (remaingWidth - lastItemWidth >= 0) {
          // add
          // visibility
        }
        // check if remaining items
        // if so display = hidden then push rest to dropdown menu
        // add menu and push rest of items into dropdown menu
        console.log('still room');
      },
    },
    // watch: {
    //   'elSize.width': 'updateBreadcrumbs',
    // },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  nav
    margin-top: 1em
    margin-bottom: 1em

  ol
    list-style: none
    padding: 0
    margin: 0

  li
    display: inline-block
    padding-right: 1em

  .breadcrumb-item-last
    overflow: hidden
    white-space: nowrap
    text-overflow: ellipsis

</style>
