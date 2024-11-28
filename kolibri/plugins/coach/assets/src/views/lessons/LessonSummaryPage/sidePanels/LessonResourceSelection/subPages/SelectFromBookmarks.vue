<template>

  <div>
    <UpdatedResourceSelection
      canSelectAll
      :source="ResourceContentSource.BOOKMARKS"
    />
  </div>

</template>


<script>

  import UpdatedResourceSelection from '../../../UpdatedResourceSelection.vue';
  import { ResourceContentSource } from '../constants';

  export default {
    name: 'SelectFromBookmarks',
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
