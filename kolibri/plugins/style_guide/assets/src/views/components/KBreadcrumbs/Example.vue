<template>

  <KBreadcrumbs :items="breadcrumbs" />

</template>


<script>

  import KBreadcrumbs from 'kolibri-components/src/KBreadcrumbs';

  export default {
    name: 'Example',
    components: { KBreadcrumbs },
    computed: {
      breadcrumbs() {
        return [
          { text: 'Top level crumb', link: {} },
          { text: 'Second level crumb', link: {} },
          { text: 'Third level crumb', link: {} },
          { text: 'Last level crumb' },
        ];
      },
    },
  };

</script>
