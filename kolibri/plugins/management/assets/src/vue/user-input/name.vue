<!-- Going to have to use sync any time you want to use this -->
<template>

  <fieldwrapper>
    <label for="name"> Name </label>
    <input
      @focus="clearErrorMessage"
      type="text" class="add-form"
      id="name" autocomplete="name"
      aria-label="name"
      autofocus="true"
      required
      v-model="data">
  </fieldwrapper>

</template>

<script>

module.exports = {
  components: {
    'fieldwrapper': require('./fieldwrapper'),
  },
  props: {
    data: {
      type: String,
      required: true,
    },
  },
}

</script>

<style lang="stylus" scoped>
  @require './text-field.styl'
</style>
