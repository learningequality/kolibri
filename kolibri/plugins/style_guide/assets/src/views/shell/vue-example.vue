<template>

  <div>
    <vuep :template="code" />
  </div>

</template>


<script>

  export default {
    props: {
      code: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
