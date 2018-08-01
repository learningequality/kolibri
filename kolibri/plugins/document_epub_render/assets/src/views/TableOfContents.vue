<template>

  <nav>
    <ul class="toc-list">
      <TableOfContentsSection
        v-for="(section, index) in toc"
        :key="index"
        :section="section"
        :depth="0"
        @tocNavigation="emitTocNavigation"
      />
    </ul>
  </nav>

</template>


<script>

  import TableOfContentsSection from './TableOfContentsSection';

  export default {
    name: 'TableOfContents',
    components: {
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
  }

</style>
