<template>

  <KGrid cols="12">
    <KGridItem size="2">
      <slot name="thumbnail"></slot>
    </KGridItem>
    <KGridItem size="8">
      <KGrid cols="8">
        <KGridItem size="5">
          <slot name="header"></slot>
        </KGridItem>
        <KGridItem size="3" alignment="right">
          <slot name="meta"></slot>
        </KGridItem>
        <KGridItem size="8">
          <slot name="description"></slot>
        </KGridItem>
      </KGrid>
    </KGridItem>
    <KGridItem size="2" alignment="right" class="raise-button">
      <slot name="buttons"></slot>
    </KGridItem>
  </KGrid>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

  export default {
    name: 'ChannelListItemLarge',
    components: {
      KGrid,
      KGridItem,
    },
  };

</script>


<style lang="scss" scoped>

  .raise-button {
    margin-top: -8px;
  }

</style>
