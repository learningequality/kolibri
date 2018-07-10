<template>

  <div>
    <vuep :template="code" />
  </div>

</template>


<script>

  export default {
    name: 'vueExample',
    props: {
      code: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped></style>
