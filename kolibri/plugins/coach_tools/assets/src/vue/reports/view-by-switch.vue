<template>

  <div>
    View by:
    <input
      :checked="value === 'content_view'"
      @change="change"
      type="radio"
      name="viewby"
      id="content"
      value="content_view"
    >
    <label for="content">Content</label>
    <input
      :checked="value === 'user_view'"
      @change="change"
      type="radio"
      name="viewby"
      id="learners"
      value="user_view"
    >
    <label for="learners">Learners</label>
  </div>

</template>


<script>

  module.exports = {
    props: {
      value: {
        type: String,
        required: true,
        validator(value) {
          return value === 'content_view' || value === 'user_view';
        },
      },
    },
    methods: {
      change(event) {
        this.$emit('switch', event.target.value);
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
