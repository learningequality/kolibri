<template>

  <div class="new-coach-block">
    Resource manager
  </div>

</template>


<script>

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import LessonActive from '../LessonActive';
  import ElapsedTime from '../ElapsedTime';
  import Completed from '../Completed';
  import NeedHelp from '../NeedHelp';
  import BackLink from '../BackLink';

  export default {
    name: 'ReportsLessonResourceManager',
    components: {
      LessonActive,
      ElapsedTime,
      Completed,
      NeedHelp,
      BackLink,
      KRouterLink,
      KDropdownMenu,
    },
    $trs: {},
  };

</script>


<style lang="scss" scoped></style>
