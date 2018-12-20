<template>

  <div class="item">
    <h3>{{ name }}</h3>
    <p>{{ assignment }}</p>
    <Completed
      :completed="completedItems"
      :total="totalItems"
    />
    <NeedHelp
      class="float"
      :num="needHelp"
    />
  </div>

</template>


<script>

  import NeedHelp from '../NeedHelp';
  import Completed from '../Completed';

  export default {
    name: 'ItemProgressDisplay',
    components: {
      NeedHelp,
      Completed,
    },
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
