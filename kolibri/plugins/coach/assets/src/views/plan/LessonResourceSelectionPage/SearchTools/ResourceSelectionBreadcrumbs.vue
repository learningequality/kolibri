<template>

  <KBreadcrumbs :items="selectionCrumbs" />

</template>


<script>

  import KBreadcrumbs from 'kolibri.coreVue.components.KBreadcrumbs';

  export default {
    name: 'ResourceSelectionBreadcrumbs',
    components: {
      KBreadcrumbs,
    },
    props: {
      ancestors: {
        type: Array,
        default: () => [],
      },
      channelsLink: {
        type: Object,
        required: true,
      },
      topicsLink: {
        type: Function,
        required: true,
      },
    },
    computed: {
      selectionCrumbs() {
        return [
          // The "Channels" breadcrumb
          { text: this.$tr('channelBreadcrumbLabel'), link: this.channelsLink },
          // Ancestors breadcrumbs
          // NOTE: The current topic is injected into `ancestors` in the showPage action
          ...this.ancestors.map(a => ({
            text: a.title,
            link: this.topicsLink(a.id),
          })),
        ];
      },
    },
    $trs: {
      channelBreadcrumbLabel: 'Channels',
    },
  };

</script>


<style lang="scss" scoped></style>
