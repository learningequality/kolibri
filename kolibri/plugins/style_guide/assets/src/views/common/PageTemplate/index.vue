<template>

  <div class="content-wrapper" :style="{paddingTop: `${headerHeight}px`}">
    <Header
      :sections="sections"
      @heightChange="newHeight => headerHeight = newHeight"
    >
      <code v-if="componentName">{{ componentName }}</code>
      <span v-else>{{ routeTitle }}</span>
    </Header>
    <div>
      <slot></slot>
    </div>
  </div>

</template>


<script>

  import PageSection from '../PageSection';
  import Header from './Header';

  export default {
    name: 'PageTemplate',
    components: {
      Header,
    },
    props: {
      componentName: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        headerHeight: 0,
      };
    },
    computed: {
      routeTitle() {
        return this.$route.meta ? this.$route.meta.title : null;
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
