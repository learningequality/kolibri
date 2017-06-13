<template>

  <div>

    <slot name="title"></slot>
    <slot name="summary"></slot>

    <table-of-contents></table-of-contents>

    <h2 id="guidelines-and-usage">Guidelines & Usage</h2>
    <slot name="guidelines-and-usage"></slot>

    <h2 id="code-examples">Examples and Code</h2>
    <vuep class="code-examples" :template="codeExamplesTemplate"></vuep>

    <h2 id="api">API</h2>
    <component-api :api="api"></component-api>

  </div>

</template>


<script>

  module.exports = {
    props: {
      codeExamplesTemplate: {
        type: String,
        required: true,
      },
      api: {
        type: Object,
        required: true,
      }
    },
    components: {
      'component-api': require('./component_api'),
      'table-of-contents': require('./table-of-contents'),
    },
  };

</script>


<style lang="stylus" scoped></style>
