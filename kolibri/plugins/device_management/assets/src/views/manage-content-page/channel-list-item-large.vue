<template>

  <k-grid cols="12">
    <k-grid-item size="2">
      <slot name="thumbnail"></slot>
    </k-grid-item>
    <k-grid-item size="8">
      <k-grid cols="8">
        <k-grid-item size="5">
          <slot name="header"></slot>
        </k-grid-item>
        <k-grid-item size="3" alignment="right">
          <slot name="meta"></slot>
        </k-grid-item>
      </k-grid>
      <div>
        <slot name="description"></slot>
      </div>
    </k-grid-item>
    <k-grid-item size="2" alignment="right" class="raise-button">
      <slot name="buttons"></slot>
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
