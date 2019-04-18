<template>

  <div>
    <p v-if="!completed" class="in-progress">
      IN PROGRESS
    </p>
    <h1 v-if="title">
      {{ title }}
    </h1>
    <slot></slot>
  </div>

</template>


<script>

  export default {
    name: 'PageTemplate',
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


<style lang="scss" scoped>

  .in-progress {
    font-weight: bold;
    text-align: right;
  }

</style>
