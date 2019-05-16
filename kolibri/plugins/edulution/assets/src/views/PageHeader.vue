<template>

  <div dir="auto" class="topic-tab">
    <h1 class="title">
      {{ title }}
    </h1>
  </div>

</template>


<script>

  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';

  export default {
    name: 'PageHeader',
    components: { ProgressIcon },
    props: {
      title: { type: String },
      progress: { type: Number, required: false },
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    display: inline-block;
  }

  .topic-tab{
    padding-left:5%;
  }

</style>
