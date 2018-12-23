<template>

  <div class="new-coach-block">
    <p>
      <BackLink
        :to="newCoachRoute('HomePage')"
        :text="$tr('back')"
      />
    </p>
    <h2>{{ $tr('classActivity') }}</h2>
    <div>
      <NotificationCard />
      <NotificationCard />
      <NotificationCard />
    </div>
    <p>
      <KButton
        appearance="flat-button"
        :text="$tr('viewMore')"
      />
    </p>
  </div>

</template>


<script>

  import imports from './imports';
  import NotificationCard from './shared/notifications/NotificationCard';

  export default {
    name: 'HomeActivityPage',
    components: {
      NotificationCard,
    },
    mixins: [imports],
    $trs: {
      back: 'Class home',
      classActivity: 'Class activity',
      noActivity: 'No activity in your class',
      viewMore: 'View more',
    },
  };

</script>


<style lang="scss" scoped></style>
