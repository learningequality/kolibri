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
export default {
  props: {
    list: {
      type: Array,
    },
    initialSelection: null,
  },
  data() {
    return { selected: this.initialSelection };
  },
};
</script>


<style lang="stylus" scoped></style>
