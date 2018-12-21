<template>

  <KNavbar>
    <KNavbarLink
      :title="$tr('home')"
      :link="link('HomePage')"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('reports')"
      :link="link('ReportsLessonListPage')"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="$tr('plan')"
      :link="link('PlanPage')"
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
    name: 'CoachTopNavbar',
    $trs: {
      home: 'Class Home',
      reports: 'Reports',
      plan: 'Plan',
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
