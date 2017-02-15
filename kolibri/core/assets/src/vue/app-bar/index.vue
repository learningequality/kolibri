<template>

  <ui-toolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    @nav-icon-click="toggleDrawer">
    <div slot="actions">
      <slot name="app-bar-actions"/>
    </div>
  </ui-toolbar>

</template>


<script>

  module.exports = {
    props: {
      title: {
        type: String,
        required: true,
      },
    },
    methods: {
      toggleDrawer() {
        console.log('toggleDrawer');
      },
    },
    components: {
      'ui-toolbar': require('keen-ui/src/UiToolbar'),
    },
  };

</script>


<style lang="stylus" scoped></style>
