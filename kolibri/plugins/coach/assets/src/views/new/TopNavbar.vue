<template>

  <KNavbar>
    <KNavbarLink
      :title="$tr('home')"
      :link="link('HomePage')"
    >
      <mat-svg name="bubble_chart" category="editor" />
    </KNavbarLink>
    <KNavbarLink
      :title="coachStrings.$tr('reportsLabel')"
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
  import imports from './imports';

  export default {
    name: 'TopNavbar',
    components: {
      KNavbar,
      KNavbarLink,
    },
    mixins: [imports],
    $trs: {
      home: 'Class Home',
      plan: 'Plan',
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
