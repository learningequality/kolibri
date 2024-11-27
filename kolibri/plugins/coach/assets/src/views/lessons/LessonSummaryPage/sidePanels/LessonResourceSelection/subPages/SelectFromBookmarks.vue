<template>

  <div>
    <UpdatedResourceSelection
      canSelectAll
      source="bookmarks"
    />
  </div>

</template>


<script>

  import UpdatedResourceSelection from '../../../UpdatedResourceSelection.vue';

  export default {
    name: 'SelectFromBookmarks',
    components: {
      UpdatedResourceSelection,
    },
  };

</script>
