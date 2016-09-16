<template>

  <div>
    <password
      :passwordmodel.sync="passwordmodel">
    </password>

    <password
      :confirm="true"
      :passwordmodel.sync="confirmpasswordmodel">
    </password>
  </div>

</template>


<script>

  module.exports = {
    components: {
      password: require('./password'),
    },
    props: {
      passwordmodel: {
        type: String,
        required: true,
        twoWay: true,
      },
      confirmpasswordmodel: {
        type: String,
        required: true,
        twoWay: true,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
