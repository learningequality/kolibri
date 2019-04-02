<template>

  <div class="template-wrapper">
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

  .template-wrapper {
    margin-right: 24px;
    margin-bottom: 240px;
  }

  .in-progress {
    font-weight: bold;
    color: red;
    text-align: right;
  }

</style>
