<template>

  <div>
    <h2 v-if="title" :id="anchor" :name="anchor">
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
  };

</script>


<style lang="scss" scoped></style>
