<template>

  <div>
    <ui-select
      :name="name"
      :value="value"
      :options="options"
      @change="change"
      class="selector"
    />
  </div>

</template>


<script>

  module.exports = {
    components: {
      'ui-select': require('keen-ui/src/UiSelect'),
      'ui-icon': require('keen-ui/src/UiIcon'),
    },
    props: {
      options: {
        type: Array,
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    methods: {
      change(value) {
        this.$emit('change', value);
      },
    },
  };

</script>


<style lang="stylus">

  .selector
    .ui-select__display-value
      font-size: 1.5em
      font-weight: bold

</style>


<style lang="stylus" scoped>

  .selector
    display: inline-flex
    vertical-align: bottom

  a
    display: inline-block
    vertical-align: bottom
    margin-bottom: 2px

</style>
