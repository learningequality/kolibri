<template>

  <PrismComponent :language="language" :code="code" />

</template>


<script>

  import PrismComponent from 'vue-prism-component';
  import Prism from 'prismjs';
  import './theme.scss';

  // https://github.com/PrismJS/prism/issues/1641#issuecomment-443440488
  document.removeEventListener('DOMContentLoaded', Prism.highlightAll);

  export default {
    name: 'CodeBlock',
    components: {
      PrismComponent,
    },
    props: {
      code: {
        type: String,
        required: true,
      },
      language: {
        type: String,
        required: false,
      },
    },
  };

</script>


<style lang="scss" scoped></style>
