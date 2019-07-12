<template>

  <div>
    <h2 v-if="title" :id="anchorId" :name="anchorId">
      {{ title }}
      <SectionLink v-if="anchor" :anchor="anchor" />
    </h2>
    <slot></slot>
  </div>

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
    },
    computed: {
      anchorId() {
        return this.anchor.replace('#', '');
      },
    },
  };

</script>


<style lang="scss" scoped></style>
