<template>

  <div class="item">
    <h3>{{ name }}</h3>
    <p><Recipients :groups="groups" /></p>
    <Completed
      :count="completedItems"
      :total="totalItems"
    />
    <NeedHelp
      class="float"
      :count="needHelp"
    />
  </div>

</template>


<script>

  import NeedHelp from '../shared/status/NeedHelp';
  import Completed from '../shared/status/Completed';
  import Recipients from '../shared/Recipients';

  export default {
    name: 'ItemProgressDisplay',
    components: {
      NeedHelp,
      Completed,
      Recipients,
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
