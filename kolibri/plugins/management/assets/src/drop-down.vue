<template>
  <select>
    <option v-for="item in list">
      {{ item }}
    </option>
  </select>
</template>


<script>
export default {
  props: {
    list: {
      type: Array,
    },
  },
};
</script>


<style lang="stylus" scoped></style>
