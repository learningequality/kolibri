<template>

  <KFixedGrid numCols="4">
    <KFixedGridItem span="1">
      <slot name="thumbnail"></slot>
    </KFixedGridItem>
    <KFixedGridItem span="3">
      <KFixedGrid numCols="3">
        <KFixedGridItem span="2">
          <slot name="header"></slot>
        </KFixedGridItem>
        <KFixedGridItem span="1" alignment="right" class="raise-button">
          <slot name="buttons"></slot>
        </KFixedGridItem>
        <KFixedGridItem span="3" alignment="right">
          <slot name="meta"></slot>
        </KFixedGridItem>
        <KFixedGridItem span="3">
          <slot name="description"></slot>
        </KFixedGridItem>
      </KFixedGrid>
    </KFixedGridItem>
  </KFixedGrid>

</template>


<script>

  import KFixedGrid from 'kolibri.shared.KFixedGrid';
  import KFixedGridItem from 'kolibri.shared.KFixedGridItem';

  export default {
    name: 'ChannelListItemSmall',
    components: {
      KFixedGrid,
      KFixedGridItem,
    },
  };

</script>


<style lang="scss" scoped>

  .raise-button {
    margin-top: -8px;
  }

</style>
