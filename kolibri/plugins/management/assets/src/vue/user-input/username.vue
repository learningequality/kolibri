<!-- Going to have to use sync any time you want to use this -->


<template>

  <div>
    <text-input
      autocomplete="username"
      :required="true"
      title="Username"
      :model.sync="usernamemodel">
    </text-input>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'fieldwrapper': require('./fieldwrapper'),
      'text-input': require('./text-input'),
    },
    props: {
      usernamemodel: {
        type: String,
        required: true,
        twoway: true,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
