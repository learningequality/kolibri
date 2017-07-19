<template>

  <div>

    <div v-if="api">
      <component-api :api="api" :requirePath="requirePath"/>
    </div>

    <table-of-contents/>

    <h2>Status</h2>
    <p v-if="status === 'complete'" class="status-complete">Fully implemented</p>
    <p v-else class="status-incomplete">Not fully implemented</p>

    <h2 id="guidelines">Guidelines</h2>
    <slot name="guidelines"/>

    <h2 id="examples">Examples</h2>
    <vuep :template="codeExamplesTemplate"/>


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
