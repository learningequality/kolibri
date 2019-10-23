<template>

  <SideBar>
    <nav>
      <ul
        ref="tocList"
        class="toc-list"
      >
        <template
          v-for="(section, index) in toc"
        >
          <TableOfContentsSection
            :key="`toc-section-${index}`"
            :section="section"
            :depth="0"
            :currentSection="currentSection"
            @tocNavigation="emitTocNavigation"
          />
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
      currentSection: {
        type: Object,
        required: false,
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

  @import './EpubStyles';

  .toc-list {
    @include toc-list;
  }

</style>
