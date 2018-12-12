<template>

  <div>
    <Vuep
      :template="code"
      :options="{ theme: 'dracula' }"
    />
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


<style lang="scss" scoped>

  @import '~codemirror/theme/dracula.css';

</style>
