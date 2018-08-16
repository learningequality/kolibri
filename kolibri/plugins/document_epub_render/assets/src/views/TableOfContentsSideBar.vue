<template>

  <SideBar>
    <nav>
      <ul
        class="toc-list"
        ref="tocList"
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
      focusOnCurrentSection() {
        if (this.currentSection && this.currentSection.href) {
          const sanitizedHref = this.currentSection.href.replace(/\W/g, '_');
          const sectionId = `#section_${sanitizedHref}`;
          const currentSectionElement = this.$refs.tocList.querySelector(sectionId);
          if (currentSectionElement) {
            currentSectionElement.focus();
          }
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './epub';

  .toc-list {
    @include toc-list;

    font-size: smaller;
  }

</style>
