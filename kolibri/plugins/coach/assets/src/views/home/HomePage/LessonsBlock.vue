<template>

  <Block
    :title="coachStrings.$tr('lessonsLabel')"
    :allLinkText="$tr('viewAll')"
    :allLinkRoute="classRoute('ReportsLessonListPage', {})"
  >
    <ContentIcon slot="icon" :kind="ContentNodeKinds.LESSON" />
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
  </Block>

</template>


<script>

  import commonCoach from '../../common';
  import ItemProgressDisplay from './ItemProgressDisplay';
  import Block from './Block';

  export default {
    name: 'LessonsBlock',
    components: {
      ItemProgressDisplay,
      Block,
    },
    mixins: [commonCoach],
    $trs: {
      viewAll: 'All lessons',
    },
  };

</script>


<style lang="scss" scoped></style>

