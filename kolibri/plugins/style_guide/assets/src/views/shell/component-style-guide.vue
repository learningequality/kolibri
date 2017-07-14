<template>

  <div>

    <slot name="title"></slot>
    <slot name="summary"></slot>

    <table-of-contents></table-of-contents>

    <h2>Status</h2>
    <p v-if="status === 'complete'" class="status-complete">Fully implemented</p>
    <p v-else class="status-incomplete">Not fully implemented</p>

    <h2 id="guidelines-and-usage">Guidelines & Usage</h2>
    <slot name="guidelines-and-usage"></slot>

    <h2 id="code-examples">Examples and Code</h2>
    <vuep class="code-examples" :template="codeExamplesTemplate"></vuep>

    <div v-if="api">
      <h2 id="api">API</h2>
      <component-api :api="api" :requirePath="requirePath"></component-api>
    </div>

  </div>

</template>


<script>

  import componentApi from './component-api';
  import tableOfContents from './table-of-contents';

  export default {
    props: {
      codeExamplesTemplate: {
        type: String,
        required: true,
      },
      api: {
        type: Object,
      },
      requirePath: {
        type: String,
      },
      status: {
        type: String,
        default: 'incomplete',
        validator(value) {
          return ['complete', 'incomplete'].includes(value);
        },
      },
    },
    components: {
      componentApi,
      tableOfContents,
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .status-complete
    color: $core-status-correct

  .status-incomplete
    color: $core-status-wrong

</style>
