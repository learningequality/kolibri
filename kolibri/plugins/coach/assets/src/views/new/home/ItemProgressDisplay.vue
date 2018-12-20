<template>

  <div class="item">
    <h3>{{ name }}</h3>
    <p>{{ assignment }}</p>
    <p>{{ $tr('completed', {completed: completedItems, total:totalItems }) }}</p>
    <p v-if="needHelp" class="float">
      <mat-svg category="alert" name="error" /> {{ needHelp }}
    </p>
  </div>

</template>


<script>

  export default {
    name: 'ItemProgressDisplay',
    components: {},
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
    computed: {
      assignment() {
        if (!this.groups.length) {
          return this.$tr('assignmentClass');
        }
        return this.$tr('assignmentGroup', { count: this.groups.length });
      },
    },
    $trs: {
      assignmentClass: 'Entire class',
      assignmentGroup: '{count, number, integer} {count, plural, one {group} other {groups}}',
      completed: '{completed, number, integer} of {total, number, integer} completed',
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
