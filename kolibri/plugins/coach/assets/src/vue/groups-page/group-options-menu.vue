<template>

  <ui-menu :options="options" @select="emitSelection" @close="emitClose"/>

</template>


<script>

  module.exports = {
    components: {
      'ui-menu': require('keen-ui/src/UiMenu'),
    },
    props: {
      options: {
        type: Array,
        required: true,
      },
      groupName: {
        type: String,
        required: true,
      },
      groupId: {
        type: String,
        required: true,
      },
    },
    methods: {
      emitSelection(option) {
        this.$emit('selected', option.label, this.groupName, this.groupId);
      },
      emitClose() {
        this.$emit('close');
      },
    },
  };

</script>


<style lang="stylus"
  scoped></style>
