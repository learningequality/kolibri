<template>

  <KEmptyPlaceholder v-if="!items.length" />
  <div v-else class="items-label">
    <span v-if="items.length === 1">
      {{ items[0] }}
    </span>
    <span v-else-if="items.length === 2">
      {{ $tr('twoItems', {item1: items[0], item2: items[1]}) }}
    </span>
    <span v-else-if="items.length === 3">
      {{ $tr('threeItems', {item1: items[0], item2: items[1], item3: items[2]}) }}
    </span>
    <span v-else>
      {{ $tr('manyItems', {item1: items[0], item2: items[1], count: items.length - 2}) }}
    </span>
  </div>

</template>


<script>

  export default {
    name: 'TruncatedItemList',
    props: {
      items: {
        type: Array,
        required: true,
      },
    },
    $trs: {
      twoItems: '{item1}, {item2}',
      threeItems: '{item1}, {item2}, {item3}',
      manyItems: '{item1}, {item2}, and {count, number, integer} others',
    },
  };

</script>


<style lang="scss" scoped>

  .items-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

</style>
