<template>

  <KNavbar>
    <KNavbarLink
      :title="$tr('home')"
      :link="link('CoachHomeIndex')"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('materials')"
      :link="link('NotificationCard')"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('progress')"
      :link="link('ClassActivityFeed')"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
  </KNavbar>

</template>


<script>

  import KNavbar from 'kolibri.coreVue.components.KNavbar';
  import KNavbarLink from 'kolibri.coreVue.components.KNavbarLink';
  import { PageNames } from '../../constants';

  export default {
    name: 'CoachTopNav',
    $trs: {
      home: 'Home',
      materials: 'Materials',
      progress: 'Progress',
    },
    components: {
      KNavbar,
      KNavbarLink,
    },
    methods: {
      link(page) {
        return {
          name: PageNames.NEW_COACH_PAGES,
          params: {
            page,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
