<template>

  <div>
    <h1>{{ title }}</h1>
    <p v-if="!completed">(In progress)</p>
    <slot />
  </div>

</template>


<script>

  export default {
    props: {
      title: {
        type: String,
        required: true,
      },
      completed: {
        type: Boolean,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
