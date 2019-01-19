<template>

  <div>
    <h2>{{ coachStrings.$tr('lessonsLabel') }}</h2>
    <p>
      <KRouterLink
        appearance="flat-button"
        :text="$tr('viewAll')"
        :to="newCoachRoute('ReportsLessonListPage')"
      />
    </p>
    <div>
      <ItemProgressDisplay
        name="Some lesson"
        :completed="2"
        :total="5"
        :needHelp="3"
        :groups="[]"
      />
      <ItemProgressDisplay
        name="Read these!"
        :completed="2"
        :total="4"
        :needHelp="0"
        :groups="[1, 2, 3]"
      />
      <ItemProgressDisplay
        name="Item name"
        :completed="2"
        :total="50"
        :needHelp="0"
        :groups="[1, 2]"
      />
    </div>
  </div>

</template>


<script>

  import imports from '../imports';
  import ItemProgressDisplay from './ItemProgressDisplay';

  export default {
    name: 'LessonsBlock',
    components: {
      ItemProgressDisplay,
    },
    mixins: [imports],
    $trs: {
      viewAll: 'All lessons',
    },
  };

</script>


<style lang="scss" scoped></style>

