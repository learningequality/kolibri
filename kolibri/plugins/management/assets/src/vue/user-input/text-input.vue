<!--
  # Required:

  - model: The data attribute you want the this input to update
    + MUST use model.sync for two-way databinding.

  - title: Labels the input and covers accessibility requirements
    + Type it in exactly as you want it presented (with caps/spaces).
      We've got things in place to adjust the id's accordingly.

  # Example:

  <text-input model.sync="nameModel" title="Name"></text-input>
-->


<template>

  <div>
    <field-wrapper>
      <label :for="field_id"> {{ title }} </label>
        {{
          // focus dispatches upwards, so that parents can listen to the event
          // generalized input, take a couple built-in args from parent
        }}
        <input
          @focus="$dispatch('focus')"
          :type="type"
          :autocomplete="autcomplete"
          :id="field_id"
          :required="required"
          v-model="model">
    </field-wrapper>
  </div>

</template>


<script>

  module.exports = {
    components: {
      'field-wrapper': require('./field-wrapper'),
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
        twoWay: true,
      },
      title: {
        type: String,
        required: true,
      },
      autocomplete: {
        type: String,
        required: false,
      },
      // debating whether to include this,
      // since we're not using `<form>` to validate
      required: {
        type: Boolean,
        required: false,
        default: false,
      },
      type: {
        type: String,
        required: false,
        default: 'text',
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
