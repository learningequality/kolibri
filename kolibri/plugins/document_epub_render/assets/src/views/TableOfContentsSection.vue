<template>

  <li class="toc-list-item">
    <KButton
      class="toc-list-item-button"
      :text="section.label"
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
        :depth="depth + 1"
        @tocNavigation="emitTocNavigation"
      />
    </ul>
  </li>

</template>


<script>

  import KButton from 'kolibri.coreVue.components.KButton';

  export default {
    name: 'TableOfContentsSection',
    components: {
      KButton,
    },
    props: {
      section: {
        type: Object,
        required: true,
      },
      depth: {
        type: Number,
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

  .toc-list-item {
    @include toc-list-item;
  }

  .toc-list-item-button {
    display: inherit;
    text-align: left;
    white-space: normal;
  }

</style>
