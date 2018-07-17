<template>

  <page-template :completed="false">

    <h1>Dropdown buttons</h1>

    <p>
      Note that dropdown buttons generally follow the same rules as regular buttons.
    </p>
    <p>
      In areas where multiple actions are necessary, raised or flat buttons
      can be made into dropdown buttons, which have multiple actions nested
      underneath them in a menu
    </p>
    <p>
      The label on a dropdown button is not an action itself, but rather
      should label the group of actions that are nested under the button
    </p>
    <p>
      If a single action is more important or prominent than the others, it
      can be brought out as its own individual button, next to the menu with
      more actions
    </p>

  </page-template>

</template>


<script>

  import componentDocs from '../../shell/ComponentDocs';
  import vueExample from '../../shell/VueExample';
  import pageTemplate from '../../shell/PageTemplate';
  import show from '../../shell/Show';

  import example from 'raw-loader!./example.html';

  import FullVue from 'vue/dist/vue.common';

  export default {
    components: {
      pageTemplate,
      componentDocs,
      vueExample,
      show,
    },
    data: () => ({
      example,
    }),
  };

</script>


<style lang="scss" scoped></style>
