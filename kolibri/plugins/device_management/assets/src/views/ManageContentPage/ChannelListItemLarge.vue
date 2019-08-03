<template>

  <KFixedGrid numCols="6">

    <KFixedGridItem span="1">
      <slot name="thumbnail"></slot>
    </KFixedGridItem>

    <KFixedGridItem span="4">

      <KFixedGrid numCols="8">
        <KFixedGridItem span="5">
          <slot name="header"></slot>
        </KFixedGridItem>
        <KFixedGridItem span="3" alignment="right">
          <slot name="meta"></slot>
        </KFixedGridItem>
        <KFixedGridItem span="8">
          <slot name="description"></slot>
        </KFixedGridItem>
      </KFixedGrid>

    </KFixedGridItem>

    <KFixedGridItem span="1" alignment="right" class="raise-button">
      <slot name="buttons"></slot>
    </KFixedGridItem>

  </KFixedGrid>

</template>


<script>

  import KFixedGrid from 'kolibri.coreVue.components.KFixedGrid';
  import KFixedGridItem from 'kolibri.coreVue.components.KFixedGridItem';

  export default {
    name: 'ChannelListItemLarge',
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
