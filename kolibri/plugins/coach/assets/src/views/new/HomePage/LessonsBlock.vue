<template>

  <div class="new-coach-block">
    <h2>{{ $tr('lessons') }}</h2>
    <p>
      <KRouterLink
        appearance="flat-button"
        :text="$tr('viewAll')"
        :to="{ name:'NEW_COACH_PAGES', params: {page: 'ReportsLessonListPage'} }"
      />
    </p>
    <div>
      <ItemProgressDisplay
        name="Some lesson"
        :completedItems="2"
        :totalItems="5"
        :needHelp="3"
        :groups="[]"
      />
      <ItemProgressDisplay
        name="Read these!"
        :completedItems="2"
        :totalItems="4"
        :needHelp="0"
        :groups="[1, 2, 3]"
      />
      <ItemProgressDisplay
        name="Item name"
        :completedItems="2"
        :totalItems="50"
        :needHelp="0"
        :groups="[1, 2]"
      />
    </div>
  </div>

</template>


<script>

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import ItemProgressDisplay from './ItemProgressDisplay';

  export default {
    name: 'LessonsBlock',
    components: {
      ItemProgressDisplay,
      KRouterLink,
    },
    $trs: {
      lessons: 'Lessons',
      viewAll: 'All lessons',
    },
  };

</script>


<style lang="scss" scoped></style>

