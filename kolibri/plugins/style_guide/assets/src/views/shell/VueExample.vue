<template>

  <div>
    <Vuep :template="code" />
  </div>

</template>


<script>

  export default {
    name: 'VueExample',
    props: {
      code: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped></style>
