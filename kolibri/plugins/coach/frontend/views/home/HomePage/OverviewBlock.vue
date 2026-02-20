<template>

  <KPageContainer>
    <p>
      <BackLink
        v-if="classListPageEnabled"
        :to="classListLink"
        :text="$tr('allClassesLabel')"
      />
      <BackLink
        v-else-if="userIsMultiFacilityAdmin && !classListPageEnabled"
        :to="{ name: 'AllFacilitiesPage' }"
        :text="coreString('changeLearningFacility')"
      />
    </p>

    <h1>
      <KLabeledIcon
        icon="classes"
        :label="$store.state.classSummary.name"
      />
    </h1>
    <HeaderTable>
      <HeaderTableRow>
        <template #key>
          <KLabeledIcon
            icon="coach"
            :label="$tr('coach', { count: coachNames.length })"
          />
        </template>
        <template #value>
          <TruncatedItemList :items="coachNames" />
        </template>
      </HeaderTableRow>
      <HeaderTableRow>
        <template #key>
          <KLabeledIcon
            icon="people"
            :label="$tr('learner', { count: learnerNames.length })"
          />
        </template>
        <template #value>
          {{ $formatNumber(learnerNames.length) }}
          <template v-if="Object.keys(filteredLearnMap).length > 0">
            <KRouterLink
              :text="coachString('viewLearners')"
              appearance="basic-link"
              :to="classLearnersListRoute"
              style="margin-left: 24px"
            />
          </template>
        </template>
      </HeaderTableRow>
    </HeaderTable>
  </KPageContainer>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import pickBy from 'lodash/pickBy';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { ref } from 'vue';
  import { ClassesPageNames } from '../../../../../learn/frontend/constants';
  import commonCoach from '../../common';
  import { LastPages } from '../../../constants/lastPagesConstants';

  export default {
    name: 'OverviewBlock',
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { userIsMultiFacilityAdmin } = useFacilities();
      const userList = ref([]);
      return { userIsMultiFacilityAdmin, userList };
    },
    computed: {
      ...mapGetters(['classListPageEnabled']),
      coachNames() {
        return this.coaches.map(coach => coach.name);
      },
      filteredLearnMap() {
        return Object.fromEntries(
          Object.entries(this.learnerMap || {}).filter(([key]) => this.userList.includes(key)),
        );
      },
      learnerNames() {
        return this.learners.map(learner => learner.name);
      },
      classListLink() {
        let facility_id;
        if (this.userIsMultiFacilityAdmin) {
          facility_id = this.$store.state.classSummary.facility_id;
        }
        return this.$router.getRoute('CoachClassListPage', { facility_id });
      },
      classLearnersListRoute() {
        const { query } = this.$route;
        const route = {
          name: ClassesPageNames.CLASS_LEARNERS_LIST_VIEWER,
          params: {
            id: this.classId,
          },
          query: {
            ...query,
            ...pickBy({
              last: LastPages.HOME_PAGE,
            }),
          },
        };
        return route;
      },
    },
    created() {
      this.fetchClassListSyncStatus();
    },
    methods: {
      ...mapActions(['fetchUserSyncStatus']),
      fetchClassListSyncStatus() {
        this.fetchUserSyncStatus({ member_of: this.$route.params.classId }).then(data => {
          if (Array.isArray(data)) {
            this.userList = data.map(item => item.user);
          }
        });
      },
    },
    $trs: {
      allClassesLabel: {
        message: 'All classes',
        context: "Link to take coach back to the 'Classes' section.",
      },
      coach: {
        message: '{count, plural, one {Coach} other {Coaches}}',
        context: 'Refers to the coach or coaches who have been assigned to a class. ',
      },
      learner: {
        message: '{count, plural, one {Learner} other {Learners}}',
        context: 'Refers to the learner or learners who are in a class.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
