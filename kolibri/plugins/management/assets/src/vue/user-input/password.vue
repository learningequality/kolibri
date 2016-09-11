<template>

  <div>
    <text-input
      :title="this.confirm ? 'Confirm Password' : 'Password'"
      :model.sync="passwordmodel"
      type="password">
    </text-input>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'text-input': require('./text-input'),
    },
    props: {
      passwordmodel: {
        type: String,
        required: true,
        twoway: true,
      },
      confirm: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
