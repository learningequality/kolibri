<template>

  <KGrid>
    <KGridItem class="prism-wrapper" :layout12="{ span: alwaysStack ? 12 : 6 }">
      <CodeBlock language="html" :code="code" />
    </KGridItem>
    <KGridItem :layout12="{ span: alwaysStack ? 12 : 6 }">
      <Show class="show">
        <slot></slot>
      </Show>
    </KGridItem>
  </KGrid>

</template>


<script>

  import CodeBlock from './CodeBlock';
  import Show from './Show';

  export default {
    name: 'VueExample',
    components: {
      CodeBlock,
      Show,
    },
    props: {
      code: {
        type: String,
        required: true,
      },
      alwaysStack: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .show {
    margin-top: 8px;
    margin-bottom: 8px;
  }

</style>
