<template>

  <AppBarCorePage :title="appBarTitle" :applyStandardLayout="applyStandardLayout">

    <template #subNav>
      <LearnTopNav ref="topNav" />
    </template>

    <div :style="styles">
      <slot></slot>
    </div>

  </AppBarCorePage>

</template>


<script>

  import AppBarCorePage from 'kolibri.coreVue.components.AppBarCorePage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import LearnTopNav from './LearnTopNav';

  export default {
    name: 'LearnAppBarPage',
    components: { AppBarCorePage, LearnTopNav },
    mixins: [commonCoreStrings],
    props: {
      appBarTitle: {
        type: String,
        default: null,
      },
      applyStandardLayout: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      styles() {
        return this.applyStandardLayout ? 'max-width: 1000px; margin: 0 auto;' : '';
      },
    },
  };

</script>
