<template>

  <div>
    <UpdatedResourceSelection :source="ResourceContentSource.TOPIC_TREE" />
  </div>

</template>


<script>

  import { ResourceContentSource } from '../constants';
  import UpdatedResourceSelection from '../../../UpdatedResourceSelection.vue';

  export default {
    name: 'SelectFromChannels',
    components: {
      UpdatedResourceSelection,
    },
    data() {
      return {
        ResourceContentSource,
      };
    },
  };

</script>
