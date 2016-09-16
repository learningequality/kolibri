<!--
  Going to have to use sync any time you want to use this
-->


<template>

  <div>
    <text-input :model.sync="namemodel" title="Name">
    </text-input>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'text-input': require('./text-input'),
    },
    props: {
      namemodel: {
        type: String,
        required: true,
        twoWay: true,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
