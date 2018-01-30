<template>

  <div>
    <h1> {{ lessonTitle }} </h1>
    <div> Options DD </div>
    <p>
      Status:
    <!-- TODO include icon + string -->
    </p>
    <div v-if="lessonActive">
      {{ $tr('active') }}
    </div>
    <div v-else>
      {{ $tr('inactive') }}
    </div>
    <p> {{ lessonDescription }} </p>
    <p> Visibility to: </p>

    <div>
      <p>{{ $tr('resources') }}</p>
      <table></table>
    </div>
  </div>

</template>


<script>

  export default {
    components: {

    },
    computed: {

    },
    methods: {

    },
    vuex: {
      getters: {
        lessonTitle: state => state.pageState.currentLesson.name,
        lessonActive: state => state.pageState.currentLesson.is_active,
        lessonDescription: state => state.pageState.currentLesson.description,
        lessonGroups: state => state.pageState.currentLesson.assigned_groups,
        lessonResources: state => state.pageState.currentLesson.resources,
      },
      actions: {

      },
    },
    $trs: {
      // TODO make labels more semantic
      options: 'Options',
      status: 'Status',
      description: 'Description',
      visibleTo: 'Visible to',
      resources: 'Resources',
      active: 'Active',
      inactive: 'Inactive',
    }
  };

</script>


<style lang="stylus" scoped></style>
