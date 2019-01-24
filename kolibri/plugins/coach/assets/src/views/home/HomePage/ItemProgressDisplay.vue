<template>

  <div>
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
    />

  </div>

</template>


<script>

  import commonCoach from '../../common';

  export default {
    name: 'ItemProgressDisplay',
    mixins: [commonCoach],
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
      isLast: {
        type: Boolean,
        default: false,
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


<style lang="scss" scoped></style>
