<template>

  <KPageContainer>
    <KGrid>
      <KGridItem
        :layout12="{ span: 6, alignment: 'left' }"
        :layout8="{ span: 4, alignment: 'left' }"
        :layout4="{ span: 2, alignment: 'left' }"
      >
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
      </KGridItem>
      <KGridItem
        :layout12="{ span: 6, alignment: 'right' }"
        :layout8="{ span: 4, alignment: 'right' }"
        :layout4="{ span: 2, alignment: 'right' }"
      >
        <KButtonGroup class="overview-actions">
          <KRouterLink
            v-if="picture_password_settings && learnerNames.length"
            :text="viewPasswordsAction$()"
            appearance="raised-button"
            :to="{
              name: PageNames.LEARNER_PASSWORDS,
              params: { classId },
              query: { last: LastPages.HOME_PAGE },
            }"
          />
          <KButton
            :text="connectDevicesTitle$()"
            appearance="raised-button"
            @click="showConnectDevices = true"
          />
        </KButtonGroup>
      </KGridItem>
    </KGrid>

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
              class="view-learners-link"
            />
          </template>
        </template>
      </HeaderTableRow>
    </HeaderTable>
    <ConnectDevicesModal
      v-if="showConnectDevices"
      @cancel="showConnectDevices = false"
    />
  </KPageContainer>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import pickBy from 'lodash/pickBy';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
  import { connectDevicesStrings } from 'kolibri-common/strings/connectDevicesStrings';
  import ConnectDevicesModal from 'kolibri-common/components/ConnectDevices/ConnectDevicesModal';
  import { ref } from 'vue';
  import { ClassesPageNames } from '../../../../../learn/frontend/constants';
  import commonCoach from '../../common';
  import { fetchClassSyncStatus } from '../../../composables/fetchClassSyncStatus';
  import { LastPages } from '../../../constants/lastPagesConstants';
  import { PageNames } from '../../../constants';

  export default {
    name: 'OverviewBlock',
    components: {
      ConnectDevicesModal,
    },
    mixins: [commonCoach, commonCoreStrings],
    setup() {
      const { userIsMultiFacilityAdmin } = useFacilities();
      const { viewPasswordsAction$ } = picturePasswordStrings;
      const { title$: connectDevicesTitle$ } = connectDevicesStrings;
      const userList = ref([]);
      const showConnectDevices = ref(false);
      return {
        userIsMultiFacilityAdmin,
        viewPasswordsAction$,
        connectDevicesTitle$,
        showConnectDevices,
        userList,
        PageNames,
        LastPages,
      };
    },
    computed: {
      ...mapGetters(['classListPageEnabled']),
      ...mapState('classSummary', ['picture_password_settings']),
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
      fetchClassListSyncStatus() {
        fetchClassSyncStatus(this.$route.params.classId).then(data => {
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


<style lang="scss" scoped>

  .view-learners-link {
    margin-left: 24px;
  }

  .overview-actions {
    margin-top: 16px;
  }

</style>
