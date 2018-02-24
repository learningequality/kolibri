<template>

  <div>
  </div>

</template>


<script>

  export default {
    name: 'lessonResourceUserSummaryPage',
    components: {},
    computed: {},
    methods: {},
    vuex: {
      getters: {},
      actions: {},
    },
    $trs: {
      previewContentButtonLabel: 'Preview',
      nameTableColumnHeader: 'Name',
      progressTableColumnHeader: 'Resource Progress',
      groupTableColumnHeader: 'Group',
      lastActiveTableColumnHeader: 'Last Active',
      lastActiveLabel: '{numberOfHours,number, integer} hours ago',
      progressPercentage: '{progress, number, percent }', //pass in fraction. Handles math + %
    },
  };

</script>


<style lang="stylus" scoped></style>
