<template>

  <KPageContainer>
    <p>
      <BackLink
        v-if="classListPageEnabled"
        :to="$router.getRoute('CoachClassListPage')"
        :text="$tr('back')"
      />
    </p>
    <h1>{{ $store.state.classSummary.name }}</h1>
    <HeaderTable>
      <HeaderTableRow>
        <template slot="key">{{ $tr('coach', {count: coachNames.length}) }}</template>
        <template slot="value"><TruncatedItemList :items="coachNames" /></template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template slot="key">{{ $tr('learner', {count: learnerNames.length}) }}</template>
        <template slot="value">
          {{ coachStrings.$tr('integer', {value: learnerNames.length}) }}
        </template>
      </HeaderTableRow>
    </HeaderTable>
  </KPageContainer>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoach from '../../common';

  export default {
    name: 'OverviewBlock',
    components: {},
    mixins: [commonCoach],
    $trs: {
      back: 'All classes',
      changeClass: 'Change class',
      coach: '{count, plural, one {Coach} other {Coaches}}',
      learner: '{count, plural, one {Learner} other {Learners}}',
    },
    computed: {
      ...mapGetters(['classListPageEnabled']),
      coachNames() {
        return this.coaches.map(coach => coach.name);
      },
      learnerNames() {
        return this.learners.map(learner => learner.name);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
