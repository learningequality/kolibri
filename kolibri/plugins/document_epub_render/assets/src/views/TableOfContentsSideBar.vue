<template>

  <SideBar>
    <nav>
      <ul class="toc-list">
        <template
          v-for="(section, index) in toc"
        >
          <TableOfContentsSection
            :key="`toc-section-${index}`"
            :section="section"
            :depth="0"
            @tocNavigation="emitTocNavigation"
          />
          <hr
            v-if="index < toc.length - 1"
            :key="`hr-${index}`"
          >
        </template>
      </ul>
    </nav>
  </SideBar>

</template>


<script>

  import SideBar from './SideBar';
  import TableOfContentsSection from './TableOfContentsSection';

  export default {
    name: 'TableOfContentsSideBar',
    components: {
      SideBar,
      TableOfContentsSection,
    },
    props: {
      toc: {
        type: Array,
        required: true,
      },
    },
    methods: {
      emitTocNavigation(section) {
        this.$emit('tocNavigation', section);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './toc';

  .toc-list {
    @include toc-list;

    font-size: smaller;
  }

</style>
