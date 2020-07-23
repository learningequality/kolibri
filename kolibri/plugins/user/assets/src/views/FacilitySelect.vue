<template>

  <AuthBase :hideCreateAccount="true">
    <div class="facility-select">
      <KRouterLink class="backlink" :to="backTo" :text="coreString('goBackAction')" icon="back" />
      <div v-if="facilityList['enabled'].length">
        <p class="label">
          {{ label }}
        </p>
        <div v-for="facility in facilityList['enabled']" :key="facility.id" class="facility-name">
          <KButton
            appearance="raised-button"
            :primary="false"
            @click="setFacility(facility.id)"
          >
            <KIcon slot="icon" icon="facility" style="margin-right: 16px;" />
            {{ facility.name }}
          </KButton>
        </div>
      </div>
      <div
        v-if="facilityList['disabled'].length"
        :class="{ 'disabled-facilities': facilityList['enabled'].length }"
      >
        <p class="label">
          {{ $tr('askAdminForAccountLabel') }}
        </p>
        <div
          v-for="facility in facilityList['disabled']"
          :key="facility.id"
          class="facility-name"
        >
          <KButton
            :disabled="true"
            :primary="false"
            appearance="raised-button"
          >
            <KIcon slot="icon" icon="facility" style="margin-right: 16px;" />
            {{ facility.name }}
          </KButton>
        </div>
      </div>
    </div>
  </AuthBase>

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import partition from 'lodash/partition';
  import { ComponentMap } from '../constants';
  import AuthBase from './AuthBase';

  export default {
    name: 'FacilitySelect',
    components: { AuthBase },
    mixins: [commonCoreStrings],
    props: {
      // This component is interstitial and needs to know where to go when it's done
      // The type is Object, but it needs to be one of the listed routes in the validator
      whereToNext: {
        type: Object,
        required: true,
        validate(obj) {
          return [ComponentMap.SIGN_IN, ComponentMap.SIGN_UP].includes(obj.name);
        },
      },
    },
    computed: {
      ...mapGetters(['facilities']),
      backTo() {
        return this.$router.getRoute(ComponentMap.AUTH_SELECT);
      },
      facilityList() {
        if (this.whereToNext.name === ComponentMap.SIGN_UP) {
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
      label() {
        return this.whereToNext.name === ComponentMap.SIGN_UP
          ? this.$tr('canSignUpForFacilityLabel')
          : this.$tr('selectFacilityLabel');
      },
    },
    methods: {
      setFacility(facilityId) {
        // Save the selected facility, get its config, then move along to next route
        this.$store.dispatch('setFacilityId', { facilityId }).then(() => {
          this.$store.dispatch('getFacilityConfig', facilityId).then(() => {
            this.$router.push(this.whereToNext);
          });
        });
      },
    },
    $trs: {
      canSignUpForFacilityLabel:
        'Select the facility that you want to associate your new account with:',
      askAdminForAccountLabel: 'Ask your administrator to create an account for these facilities:',
      selectFacilityLabel: 'Select the facility that has your account',
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
    margin-top: 12px;
  }

  .button {
    width: 100%;
    font-weight: normal;
    text-align: left;
    text-transform: none;
  }

  .label {
    // 12 margin from button beneath + 4 for 16px
    padding-bottom: 4px;
    font-size: 14px;
  }

  .backlink {
    margin: 24px 0 16px;
  }

</style>
