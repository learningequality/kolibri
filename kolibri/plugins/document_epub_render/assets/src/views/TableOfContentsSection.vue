<template>

  <li
    class="toc-list-item"
    :class="{ 'toc-list-item-top-level': depth === 0 }"
  >

    <KButton
      :id="sectionId"
      class="toc-list-item-button"
      :class="{ 'toc-list-item-button-current': isCurrentSection }"
      :text="section.label.trim() || section.href"
      appearance="basic-link"
      @click="$emit('tocNavigation', section)"
    />
    <ul
      v-if="section.subitems && section.subitems.length > 0"
      class="toc-list"
    >
      <TableOfContentsSection
        v-for="(subsection, index) in section.subitems"
        :key="index"
        :section="subsection"
        :currentSection="currentSection"
        :depth="depth + 1"
        @tocNavigation="emitTocNavigation"
      />
    </ul>
  </li>

</template>


<script>

  export default {
    name: 'TableOfContentsSection',
    props: {
      section: {
        type: Object,
        required: true,
      },
      depth: {
        type: Number,
        required: true,
      },
      currentSection: {
        type: Object,
        required: false,
      },
    },
    computed: {
      isCurrentSection() {
        if (this.currentSection) {
          return (
            this.currentSection.href === this.section.href &&
            this.currentSection.label === this.section.label
          );
        }
        return false;
      },
      sectionId() {
        const sanitizedHref = this.section.href.replace(/\W/g, '_');
        return `section_${sanitizedHref}`;
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

  .toc-list-item {
    @include toc-list-item;

    padding-left: 8px;
  }

  .toc-list-item-top-level {
    padding-left: 0;
  }

  .toc-list-item-button {
    @include epub-basic-link;
  }

  .toc-list-item-button-current {
    font-weight: bold;
    text-decoration: underline;
  }

</style>
