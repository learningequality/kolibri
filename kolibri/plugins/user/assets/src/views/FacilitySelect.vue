<template>

  <AuthBase>
    <div class="facility-select">
      <KRouterLink :to="backTo" :text="coreString('goBackAction')" icon="back" />
      <div>
        <p>{{ $tr('canSignUpForFacilityLabel') }}</p>
        <div v-for="facility in facilityList['enabled']" :key="facility.id" class="facility-name">
          <KButton appearance="basic-link" @click="setFacility(facility.id)">
            {{ facility.name }}
          </KButton>
        </div>
      </div>
      <div v-if="facilityList['disabled'].length" class="disabled-facilities">
        <p>{{ $tr('askAdminForAccountLabel') }}</p>
        <div
          v-for="facility in facilityList['disabled']"
          :key="facility.id"
          class="disabled facility-name"
        >
          {{ facility.name }}
        </div>
      </div>
    </div>
  </AuthBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import partition from 'lodash/partition';
  import { PageNames } from '../constants';
  import AuthBase from './AuthBase';

  export default {
    name: 'FacilitySelect',
    components: { AuthBase },
    mixins: [commonCoreStrings],
    computed: {
      ...mapGetters(['facilities']),
      backTo() {
        return this.$router.getRoute(this.$route.query.backTo);
      },
      facilityList() {
        if (this.$route.query.next === PageNames.SIGN_UP) {
          const partitionedFacilities = partition(
            this.facilities,
            f => f.dataset.learner_can_sign_up
          );
          return {
            enabled: partitionedFacilities[0],
            disabled: partitionedFacilities[1],
          };
        } else {
          return { enabled: this.facilities, disabled: [] };
        }
      },
    },
    methods: {
      setFacility(facilityId) {
        console.log(`setting facId ${facilityId}`);
        this.$store.dispatch('setFacilityId', { facilityId }).then(() => {
          this.$router.push({ name: this.$route.query.next });
        });
      },
    },
    $trs: {
      canSignUpForFacilityLabel:
        'Select the facility that you want to associate your new account with:',
      askAdminForAccountLabel: 'Ask your administrator to create an account for these facilities:',
    },
  };

</script>


<style lang="scss" scoped>

  .facility-select {
    text-align: left;
  }

  .disabled-facilities {
    margin-top: 40px;
  }

  .facility-name {
    margin-top: 16px;

    &.disabled {
      color: black;
      text-decoration: none;
    }
  }

</style>
