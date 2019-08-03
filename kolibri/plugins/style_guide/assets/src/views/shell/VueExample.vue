<template>

  <KGrid>
    <KGridItem :layout12="{ span: alwaysStack ? 12 : 6 }">
      <Prism language="html" :code="code" />
    </KGridItem>
    <KGridItem :layout12="{ span: alwaysStack ? 12 : 6 }">
      <Show class="show">
        <slot></slot>
      </Show>
    </KGridItem>
  </KGrid>

</template>


<script>

  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import Prism from 'vue-prism-component';
  import Show from './Show';

  export default {
    name: 'VueExample',
    components: {
      KGrid,
      KGridItem,
      Prism,
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
