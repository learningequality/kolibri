<template>

  <div class="flex-column">
    <slot name="topActions"></slot>

    <KGrid v-if="$slots.otherFilter || $slots.filter">
      <KGridItem :layout12="{ span: 7 }">
        <slot name="otherFilter"></slot>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 5, alignment: 'right' }"
        class="text-filter"
      >
        <slot name="filter"></slot>
      </KGridItem>
    </KGrid>

    <div class="flex-column table-content">
      <slot> </slot>
    </div>

    <slot name="bottomActions"></slot>
  </div>

</template>


<script>

  export default {
    name: 'PaginatedListContainerWithBackend',
  };

</script>


<style lang="scss" scoped>

  .pagination-nav {
    /* Ensure space for pagination buttons on touch devices */
    margin-top: 1em;
    text-align: right;
  }

  .text-filter {
    margin-top: 14px;
  }

  .pagination-label {
    position: relative;
    top: -2px;
    display: inline;
  }

  .flex-column {
    display: flex;
    flex-direction: column;
    // Min height is set to 0 to allow flex items to shrink
    min-height: 0;
  }

</style>
