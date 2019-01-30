<template>

  <div>
    {{ completed }} / {{ started }} / {{ total }}
  </div>

</template>


<script>

  export default {
    name: 'StatusSummary',
    components: {},
    props: {
      total: {
        type: Number,
        required: true,
      },
      completed: {
        type: Number,
        required: true,
      },
      started: {
        type: Number,
        required: true,
      },
    },
    computed: {},
  };

</script>


<style lang="scss" scoped></style>
