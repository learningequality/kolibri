<template>

  <KTextbox ref="textbox" label="Hit TAB, focus should go here" style="margin-top: 2em;" />

</template>


<script>

  export default {
    name: 'ResourceSelection',
    methods: {
      /** @public */
      focusFirstEl() {
        this.$refs.textbox.focus();
      },
    },
  };

</script>
