<template>

  <div class="template-wrapper">
    <p v-if="!completed" class="in-progress">IN PROGRESS</p>
    <h1 v-if="title">{{ title }}</h1>
    <slot></slot>
  </div>

</template>


<script>

  export default {
    props: {
      title: {
        type: String,
        required: false,
      },
      completed: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .template-wrapper
    margin-right: 24px
    margin-bottom: 24px

  .in-progress
    text-align: right
    color: red
    font-weight: bold

</style>
