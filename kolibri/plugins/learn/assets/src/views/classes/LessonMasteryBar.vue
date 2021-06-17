<template>

  <UiToolbar>
    <template #icon>
      <OverallStatus :style="{ 'margin-left': '8px' }" />
    </template>

    <template #actions>
      <Hint :style="{ 'margin-right': '32px' }" />
    </template>
  </UiToolbar>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import OverallStatus from './OverallStatus.vue';
  import Hint from './Hint.vue';

  export default {
    name: 'LessonMasteryBar',
    components: {
      UiToolbar,
      OverallStatus,
      Hint,
    },
    mixins: [KResponsiveWindowMixin],
  };

</script>
