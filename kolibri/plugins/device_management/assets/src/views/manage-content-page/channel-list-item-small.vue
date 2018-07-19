<template>

  <k-grid cols="4">
    <k-grid-item size="1">
      <slot name="thumbnail"></slot>
    </k-grid-item>
    <k-grid-item size="3">
      <k-grid cols="3">
        <k-grid-item size="2">
          <slot name="header"></slot>
        </k-grid-item>
        <k-grid-item size="1" alignment="right" class="raise-button">
          <slot name="buttons"></slot>
        </k-grid-item>
        <k-grid-item size="3" alignment="right">
          <slot name="meta"></slot>
        </k-grid-item>
        <k-grid-item size="3">
          <slot name="description"></slot>
        </k-grid-item>
      </k-grid>
    </k-grid-item>
  </k-grid>

</template>


<script>

  import kGrid from 'kolibri.coreVue.components.kGrid';
  import kGridItem from 'kolibri.coreVue.components.kGridItem';

  export default {
    name: 'channelListItemLarge',
    components: {
      kGrid,
      kGridItem,
    },
  };

</script>


<style lang="scss" scoped>

  .raise-button {
    margin-top: -8px;
  }

</style>
