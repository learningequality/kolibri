<template>

  <div class="new-coach-block">
    <h2>{{ $tr('classActivity') }}</h2>
    <p>
      <KRouterLink
        appearance="flat-button"
        :text="$tr('viewAll')"
        :to="{ name:'NEW_COACH_PAGES', params: {page: 'AllActivity'} }"
      />
    </p>
    <div>
      <NotificationCard />
      <NotificationCard />
      <NotificationCard />
    </div>
  </div>

</template>


<script>

  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import NotificationCard from '../shared/NotificationCard';

  export default {
    name: 'ActivityBlock',
    components: {
      KRouterLink,
      NotificationCard,
    },
    props: {},
    computed: {},
    methods: {},
    $trs: {
      classActivity: 'Class activity',
      noActivity: 'No activity in your class',
      viewAll: 'View all',
    },
  };

</script>


<style lang="scss" scoped></style>
