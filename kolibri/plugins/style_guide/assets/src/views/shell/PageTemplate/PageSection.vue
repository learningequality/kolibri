<template>

  <section :style="style" class="section-wrapper">
    <h2 v-if="title" :id="anchorId" :name="anchorId">
      {{ title }}
      <SectionLink v-if="anchor" :anchor="anchor" />
    </h2>
    <slot></slot>
  </section>

</template>


<script>

  import SectionLink from './SectionLink';

  export default {
    name: 'PageSection',
    components: {
      SectionLink,
    },
    props: {
      title: {
        type: String,
        required: false,
      },
      anchor: {
        type: String,
        required: false,
      },
      fullwidth: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      anchorId() {
        if (!this.anchor) {
          return null;
        }
        return this.anchor.replace('#', '');
      },
      style() {
        return this.fullwidth ? {} : { maxWidth: '700px' };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .section-wrapper {
    margin-right: auto;
  }

  .section-wrapper:not(:first-child) {
    margin-top: 32px;
    border-top: 1px solid #dedede;
  }

</style>
