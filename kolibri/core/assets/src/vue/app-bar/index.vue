<template>

  <ui-toolbar
    :title="title"
    type="colored"
    textColor="white"
    class="app-bar"
    :removeNavIcon="navShown"
    @nav-icon-click="$emit('toggleSideNav')"
    v-bind:style="{ height: height + 'px' }">
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
      navShown: {
        type: Boolean,
        required: true,
      },
      height: {
        type: Number,
        required: true,
      },
    },
    components: {
      'ui-toolbar': require('keen-ui/src/UiToolbar'),
    },
  };

</script>


<style lang="stylus" scoped></style>
