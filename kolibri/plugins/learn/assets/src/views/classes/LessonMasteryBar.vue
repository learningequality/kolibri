<template>

  <!-- z-index 7 - one beneath top menu bar for nested elevations -->
  <UiToolbar style="z-index: 7;">
    <template #icon>
      <OverallStatus />
    </template>

    <template #actions>
      <slot name="hint"></slot>
    </template>
  </UiToolbar>

</template>


<script>

  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import OverallStatus from './OverallStatus.vue';

  export default {
    name: 'LessonMasteryBar',
    components: {
      UiToolbar,
      OverallStatus,
    },
    mixins: [KResponsiveWindowMixin],
  };

</script>
