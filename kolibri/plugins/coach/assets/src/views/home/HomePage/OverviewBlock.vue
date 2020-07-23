<template>

  <KPageContainer>
    <p>
      <BackLink
        v-if="classListPageEnabled"
        :to="classListLink"
        :text="$tr('allClassesLabel')"
      />
    </p>

    <h1>
      <KLabeledIcon icon="classes" :label="$store.state.classSummary.name" />
    </h1>
    <HeaderTable>
      <HeaderTableRow>
        <KLabeledIcon slot="key" icon="coach" :label="$tr('coach', { count: coachNames.length })" />
        <template v-slot:value>
          <TruncatedItemList :items="coachNames" />
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <KLabeledIcon
          slot="key"
          icon="people"
          :label="$tr('learner', { count: learnerNames.length })"
        />
        <template v-slot:value>
          {{ coachString('integer', { value: learnerNames.length }) }}
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
    computed: {
      ...mapGetters(['classListPageEnabled']),
      coachNames() {
        return this.coaches.map(coach => coach.name);
      },
      learnerNames() {
        return this.learners.map(learner => learner.name);
      },
      classListLink() {
        let facility_id;
        if (this.$store.getters.userIsMultiFacilityAdmin) {
          facility_id = this.$store.state.classSummary.facility_id;
        }
        return this.$router.getRoute('CoachClassListPage', {}, { facility_id });
      },
    },
    $trs: {
      allClassesLabel: 'All classes',
      coach: '{count, plural, one {Coach} other {Coaches}}',
      learner: '{count, plural, one {Learner} other {Learners}}',
    },
  };

</script>


<style lang="scss" scoped></style>
