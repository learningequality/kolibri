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

  import { navMenu } from '../../../routes.js';
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
        for (let i = 0; i < navMenu.length; i++) {
          for (let j = 0; j < navMenu[i].sectionItems.length; j++) {
            if (this.$route.path === navMenu[i].sectionItems[j].itemRoute.path) {
              return navMenu[i].sectionItems[j].itemName;
            }
          }
        }
        return 'Home';
      },
      sections() {
        return this.$slots.default
          .filter(node => node.componentOptions && node.componentOptions.tag === PageSection.name)
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
