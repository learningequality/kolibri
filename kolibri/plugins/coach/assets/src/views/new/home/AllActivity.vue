<template>

  <div class="new-coach-block">
    <p>
      <BackLink
        :to="{ name:'NEW_COACH_PAGES', params: { page: 'CoachHomeIndex' } }"
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
  import BackLink from '../BackLink';
  import NotificationCard from './NotificationCard';

  export default {
    name: 'AllActivity',
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
