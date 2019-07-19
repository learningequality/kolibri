<template>

  <KTextbox
    ref="textbox"
    :value="value"
    :disabled="$attrs.disabled"
    :label="$tr('label')"
    :autofocus="$attrs.autofocus"
    :maxlength="120"
    :invalid="Boolean(invalidText)"
    :invalidText="invalidText"
    @blur="blurred = true"
    @input="handleInput"
  />

</template>


<script>

  import KTextbox from 'kolibri.coreVue.components.KTextbox';

  export default {
    name: 'TextboxFullName',
    components: {
      KTextbox,
    },
    props: {
      value: {
        type: String,
      },
      shouldValidate: {
        type: Boolean,
      },
    },
    data() {
      return {
        blurred: false,
      };
    },
    computed: {
      invalidText() {
        if (this.blurred || this.shouldValidate) {
          if (this.value === '') {
            return this.$tr('errorEmptyString');
          }
        }
        return '';
      },
      isValid() {
        return this.invalidText === '';
      },
    },
    watch: {
      isValid(value) {
        this.$emit('update:isValid', value);
      },
    },
    methods: {
      // @public
      focus() {
        return this.$refs.textbox.focus();
      },
    },
    $trs: {
      label: 'Full name',
      errorEmptyString: 'This field is required',
    },
  };

</script>


<style lang="scss" scoped></style>
