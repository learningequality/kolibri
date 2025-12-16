<template>

  <KEmptyPlaceholder v-if="!items.length" />
  <div
    v-else
    class="items-label"
  >
    <span>
      {{ getTruncatedItemsString(items) }}
    </span>
  </div>

</template>


<script>

  import { getTruncatedItemsString } from './commonCoachStrings';

  export default {
    name: 'TruncatedItemList',
    props: {
      items: {
        type: Array,
        required: true,
      },
    },
    methods: {
      getTruncatedItemsString,
    },
  };

</script>


<style lang="scss" scoped>

  .items-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

</style>
