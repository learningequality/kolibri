<template>

  <div>
    <field-wrapper>
      <label for="user-role">
        <span class="visuallyhidden">
          User Role
        </span>
      </label>

      <select v-model="rolemodel" id="user-role">
        <option value="learner">
          Learner
        </option>

        <option value="admin">
          Admin
        </option>
      </select>
    </field-wrapper>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'field-wrapper': require('./field-wrapper'),
    },
    props: {
      rolemodel: {
        type: String,
        required: true,
        twoWay: true,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  select
    width: 100%
    height: 40px
    font-weight: bold
    background-color: transparent

</style>
