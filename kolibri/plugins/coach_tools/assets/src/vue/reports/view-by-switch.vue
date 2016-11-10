<template>

  <div>
    <div>
      View by:
    </div>
    <label>
      <input
        :checked="iscontent"
        @change="change"
        type="radio"
        name="viewby"
        value="content"
      >
      Content
    </label>
    <label>
      <input
        :checked="!iscontent"
        @change="change"
        type="radio"
        name="viewby"
        value="learners"
      >
      Learners
    </label>
  </div>

</template>


<script>

  module.exports = {
    props: {
      iscontent: {
        type: Boolean,
        required: true,
      },
    },
    methods: {
      change(event) {
        if (event.target.value === 'content') {
          this.$emit('toggled', true);
        } else {
          this.$emit('toggled', false);
        }
      },
    },
  };

</script>


<style lang="stylus" scoped>

  label
    display: block

</style>
