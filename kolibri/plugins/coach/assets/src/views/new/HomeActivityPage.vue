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

  import KButton from 'kolibri.coreVue.components.KButton';
  import BackLink from './shared/BackLink';
  import NotificationCard from './shared/notifications/NotificationCard';

  export default {
    name: 'HomeActivityPage',
    components: {
      KButton,
      NotificationCard,
      BackLink,
    },
    props: {},
    computed: {},
    methods: {},
    $trs: {
      back: 'Back',
      classActivity: 'Class activity',
      noActivity: 'No activity in your class',
      viewMore: 'View more',
    },
  };

</script>


<style lang="scss" scoped></style>
