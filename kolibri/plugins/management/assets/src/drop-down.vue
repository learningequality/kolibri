<template>
  <select v-model="selected">
    <template v-for="option in list">
      <option :value="option">
        {{ option.name }}
      </option>
    </template>
  </select>
</template>


<script>
module.exports = {
  props: {
    list: {
      type: Array,
    },
    selected: null,
  },
};
</script>


<style lang="stylus" scoped></style>
