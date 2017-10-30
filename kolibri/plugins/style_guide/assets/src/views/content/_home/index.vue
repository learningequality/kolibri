<template>

  <page-template :completed="true">
    <h1>Kolibri Style Guide</h1>
    <p>This is a resource for developers and designers.</p>

    <h2>Scope</h2>
    <p>
      This guide is meant to cover the majority of the application. There will always be edge cases, and common sense always trumps rote rules. Maintain consistency as much as possible, but don’t make significant sacrifices in the UX for the sake of consistency.
    </p>

  </page-template>

</template>


<script>

  import pageTemplate from '../../shell/page-template';

  export default {
    components: {
      pageTemplate,
    },
  };

</script>


<style lang="stylus" scoped></style>
