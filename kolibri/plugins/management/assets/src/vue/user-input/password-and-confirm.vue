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
        twoway: true,
      },
      confirmpasswordmodel: {
        type: String,
        required: true,
        twoway: true,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
