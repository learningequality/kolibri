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

  import KGrid from 'kolibri.shared.KGrid';
  import KGridItem from 'kolibri.shared.KGridItem';
  import CodeBlock from './CodeBlock';
  import Show from './Show';

  export default {
    name: 'VueExample',
    components: {
      KGrid,
      KGridItem,
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
