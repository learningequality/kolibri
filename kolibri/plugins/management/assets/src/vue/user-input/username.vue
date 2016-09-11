<!--
  # Required:

  - usernamemodel: The data representing the username you want to update
    + MUST use model.sync for two-way databinding.

  # Example:

  <username usernamemodel.sync="user.username"></username>
-->


<template>

  <div>
    <text-input
      autocomplete="username"
      title="Username"
      :model.sync="usernamemodel">
    </text-input>
  </div>

</template>


<script>

  module.exports = {
    components: {
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
