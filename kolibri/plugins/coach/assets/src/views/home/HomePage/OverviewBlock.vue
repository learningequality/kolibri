<template>

  <KPageContainer>
    <p>
      <BackLink
        v-if="classListPageEnabled"
        :to="$router.getRoute('CoachClassListPage')"
        :text="$tr('back')"
      />
    </p>
    <KGrid>
      <KGridItem sizes="100, 50, 50" percentage>
        <h1>{{ $store.state.classSummary.name }}</h1>
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage align="right">
        <KButton
          :text="$tr('newUserButtonLabel')"
          :primary="true"
          @click="displayModal(Modals.COACH_CREATE_USER)"
        />
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage>
        <HeaderTable>
          <HeaderTableRow>
            <KLabeledIcon slot="key">
              <KIcon slot="icon" coach />
              {{ $tr('coach', {count: coachNames.length}) }}
            </KLabeledIcon>
            <template slot="value"><TruncatedItemList :items="coachNames" /></template>
          </HeaderTableRow>
          <HeaderTableRow>
            <KLabeledIcon slot="key">
              <KIcon slot="icon" people />
              {{ $tr('learner', {count: learnerNames.length}) }}
            </KLabeledIcon>
            <template slot="value">
              {{ coachStrings.$tr('integer', {value: learnerNames.length}) }}
            </template>
          </HeaderTableRow>
        </HeaderTable>
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage align="right">
        <KButton
          :text="$tr('subscriptionButtonLabel')"
          :primary="false"
          @click="displayModal(SubscriptionModals.CHOOSE_CLASS_SUBSCRIPTIONS)"
        />
      </KGridItem>
    </KGrid>

    <CoachUserCreateModal
      v-if="modalShown===Modals.COACH_CREATE_USER"
      :classId="thisClassId.join('')"
      :className="thisClassName.join('')"
    />
    <SubscribeModal
      v-if="modalShown===SubscriptionModals.CHOOSE_CLASS_SUBSCRIPTIONS"
      :collectionId="thisClassId.join('')"
      :collectionName="thisClassName.join('')"
    />
  </KPageContainer>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import commonCoach from '../../common';
  import { Modals } from '../../../constants';
  import { SubscriptionModals } from '../../../constants/subscriptionsConstants';
  import SubscribeModal from '../../SubscribeModal';
  import CoachUserCreateModal from './CoachUserCreateModal';

  export default {
    name: 'OverviewBlock',
    metaInfo() {
      return {
        className: this.getClassName,
      };
    },
    components: {
      SubscribeModal,
      CoachUserCreateModal,
    },
    mixins: [commonCoach],
    $trs: {
      back: 'All classes',
      changeClass: 'Change class',
      coach: '{count, plural, one {Coach} other {Coaches}}',
      learner: '{count, plural, one {Learner} other {Learners}}',
      newUserButtonLabel: 'Create New Learner',
      subscriptionButtonLabel: 'Subscribe to Channels',
    },
    computed: {
      ...mapGetters(['classListPageEnabled']),
      ...mapState('userManagement', ['facilityUsers', 'modalShown']),
      Modals: () => Modals,
      SubscriptionModals: () => SubscriptionModals,
      coachNames() {
        return this.coaches.map(coach => coach.name);
      },
      learnerNames() {
        return this.learners.map(learner => learner.name);
      },
      thisClassName() {
        return this.className;
      },
      thisClassId() {
        return this.getClassId;
      },
    },
    methods: {
      ...mapActions('userManagement', ['displayModal']),
    },
  };

</script>


<style lang="scss" scoped></style>
