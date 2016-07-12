<template>

  <img :src="src" alt="">

</template>


<script>

  module.exports = {
    props: {
      progress: {
        type: String,
        default: 'unstarted',
      },
      kind: {
        type: String,
        required: true,
      },
    },
    computed: {
      src() {
        // Note: dynamic requires should be used carefully because
        //  they greedily add items to the webpack bundle.
        // See https://webpack.github.io/docs/context.html
        return require(`./content-icons/${this.progress}-${this.kind}.svg`);
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
