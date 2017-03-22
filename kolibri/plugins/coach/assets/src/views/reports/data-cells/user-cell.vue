<template>

  <div>{{ name }}</div>

</template>


<script>

  module.exports = {
    props: {
      name: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
