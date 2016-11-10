<template>

  <div>
    View by:
    <input
      :checked="iscontent"
      @change="change"
      type="radio"
      name="viewby"
      id="content"
    >
    <label for="content">Content</label>
    <input
      :checked="!iscontent"
      @change="change"
      type="radio"
      name="viewby"
      id="learners"
    >
    <label for="learners">Learners</label>
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
        if (event.target.id === 'content') {
          this.$emit('toggled', true);
        } else {
          this.$emit('toggled', false);
        }
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
