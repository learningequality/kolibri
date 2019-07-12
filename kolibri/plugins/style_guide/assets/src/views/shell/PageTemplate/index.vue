<template>

  <div class="content-wrapper" :style="{paddingTop: `${headerHeight}px`}">
    <Header
      :title="header"
      :sections="sections"
      @heightChange="newHeight => headerHeight = newHeight"
    />
    <slot></slot>
  </div>

</template>


<script>

  import { titleForRoute } from '../../../routes.js';
  import Header from './Header';
  import PageSection from './PageSection';

  export default {
    name: 'PageTemplate',
    components: {
      Header,
    },
    data() {
      return {
        headerHeight: 0,
      };
    },
    computed: {
      header() {
        return titleForRoute(this.$route);
      },
      sections() {
        return this.$slots.default
          .filter(
            node =>
              node.componentOptions &&
              node.componentOptions.tag === PageSection.name &&
              node.componentOptions.propsData.anchor
          )
          .map(node => node.componentOptions.propsData);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .content-wrapper {
    min-width: 350px;
    padding-right: 32px;
    padding-bottom: 64px;
    margin-right: auto;
  }

</style>
