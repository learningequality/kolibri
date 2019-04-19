<template>

  <div dir="auto">
    <h1 class="title">
      {{ title }}
    </h1>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';

  export default {
    name: 'PageHeader',
    components: { ProgressIcon },
    props: { title: { type: String }, progress: { type: Number } },
  };

</script>


<style lang="scss" scoped>

  .title {
    display: inline-block;
  }

</style>
