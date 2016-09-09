<!--
  # Required:

  - model: The data attribute you want the this input to update
    + MUST use model.sync for two-way databinding.

  - title: Labels the input and covers accessibility requirements
    + Type it in exactly as you want it presented (with caps/spaces).
      We've got things in place to adjust the id's accordingly.

  # Example:

  <fieldwrapper model.sync="nameModel" title="Name">
-->


<template>

  <div>
    <fieldwrapper>
      <label :for="field_id"> {{ title }} </label>
        {{
          // focus dispatches upwards, so that parents can listen to the event
          // generalized input, take a couple built-in args from parent
        }}
        <input
          @focus="$dispatch('focus')"
          type="text"
          :autocomplete="autcomplete"
          :id="field_id"
          :required="required"
          v-model="model">
    </fieldwrapper>
  </div>

</template>


<script>

  module.exports = {
    components: {
      fieldwrapper: require('./fieldwrapper'),
    },
    computed: {
      field_id() {
        // removes all spaces and sets all letters to lowercase
        const fieldId = this.title.replace(/\s+/g, '').toLowerCase();
        return fieldId;
      },
    },
    props: {
      model: {
        type: String,
        required: true,
        twoway: true,
      },
      title: {
        type: String,
        required: true,
      },
      autocomplete: {
        type: String,
        required: false,
      },
      required: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme'

  input
    width: 100%
    height: 30px
    font-weight: bold
    margin: 0 auto
    display: block
    padding: 5px 10px
    letter-spacing: 0.08em
    border: none
    border-bottom: 1px solid $core-text-default
    height: 30px
    &:focus
      outline: none
      border-bottom: 3px solid $core-action-normal

</style>
