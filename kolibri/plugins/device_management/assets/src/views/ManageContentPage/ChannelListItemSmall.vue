<template>

  <KGrid cols="4">
    <KGridItem size="1">
      <slot name="thumbnail"></slot>
    </KGridItem>
    <KGridItem size="3">
      <KGrid cols="3">
        <KGridItem size="2">
          <slot name="header"></slot>
        </KGridItem>
        <KGridItem size="1" alignment="right" class="raise-button">
          <slot name="buttons"></slot>
        </KGridItem>
        <KGridItem size="3" alignment="right">
          <slot name="meta"></slot>
        </KGridItem>
        <KGridItem size="3">
          <slot name="description"></slot>
        </KGridItem>
      </KGrid>
    </KGridItem>
  </KGrid>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';

  export default {
    name: 'ChannelListItemSmall',
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
