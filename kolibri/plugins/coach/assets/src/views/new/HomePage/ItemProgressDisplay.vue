<template>

  <div class="item">
    <h3>{{ name }}</h3>
    <p><Recipients :groups="groups" /></p>

    <LearnerProgressRatio
      :count="completedItems"
      :total="totalItems"
      :verbosity="2"
      :icon="completedItems === totalItems ? 'star' : 'clock'"
      verb="completed"
    />

    <LearnerProgressCount
      :count="needHelp"
      :verbosity="0"
      icon="help"
      verb="needHelp"
      class="float"
    />

  </div>

</template>


<script>

  import imports from '../imports';

  export default {
    name: 'ItemProgressDisplay',
    mixins: [imports],
    props: {
      name: {
        type: String,
        required: true,
      },
      groups: {
        type: Array,
        required: true,
      },
      completedItems: {
        type: Number,
        required: true,
      },
      totalItems: {
        type: Number,
        required: true,
      },
      needHelp: {
        type: Number,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .item {
    border-top: 1px solid gray;
  }

  .float {
    float: right;
  }

</style>
