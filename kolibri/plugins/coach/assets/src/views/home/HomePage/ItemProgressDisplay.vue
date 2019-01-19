<template>

  <div class="item">
    <h3>{{ name }}</h3>
    <p><Recipients :groups="groups" /></p>

    <LearnerProgressRatio
      :count="completed"
      :total="total"
      :verbosity="2"
      :icon="progressIcon"
      verb="completed"
    />

    <LearnerProgressCount
      v-if="needHelp"
      :count="needHelp"
      :verbosity="0"
      icon="help"
      verb="needHelp"
      class="float"
    />

  </div>

</template>


<script>

  import imports from '../../new/imports';

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
      completed: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
      needHelp: {
        type: Number,
        default: 0,
      },
    },
    computed: {
      progressIcon() {
        if (this.completed === 0) {
          return 'nothing';
        }
        if (this.completed === this.total) {
          return 'star';
        }
        return 'clock';
      },
    },
  };

</script>


<style lang="scss" scoped>

  .item {
    margin-bottom: 8px;
    border-top: 1px solid gray;
  }

  .float {
    float: right;
  }

</style>
