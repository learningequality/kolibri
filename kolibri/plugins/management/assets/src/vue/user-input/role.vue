<template>
  <fieldwrapper>

    <label for="user-role">
      <span class="visuallyhidden">
        User Role
      </span>
    </label>

    <select @focus="clearErrorMessage" v-model="rolemodel" id="user-role">
      <option value="learner">
        Learner
      </option>
      <option value="admin"> Admin </option>
    </select>
  </fieldwrapper>
</template>

<script>
  module.exports = {
    components: {
      'fieldwrapper': require('./fieldwrapper'),
    },
    ready: {
      // setting the default value of the role to learner unless specified.
      this.rolemodel = this.defaultrole;
    },
    props: {
      rolemodel: {
        type: String,
        required: true,
      },
      // TODO add custom validation to make sure the role exists.
      defaultrole: {
        type:String,
        required: false,
        default: 'learner',
      },
    },
  }
</script>

<style lang="stylus" scoped>
  select
    width: 100%
    height: 40px
    font-weight: bold
    background-color: transparent
</style>
