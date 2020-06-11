<template>

  <OnboardingForm
    :header="header"
    :description="formDescription"
    :disabled="selectedFacilityId === ''"
    @submit="handleSubmit"
  >
    <div>
      <!-- Only one Facility -->
      <template v-if="facilities.length === 1">
        <FacilityAdminCredentialsForm
          ref="credentials"
          :facility="facilities[0]"
          :device="device"
          :singleFacility="true"
          :shouldValidate="shouldValidate"
        />
      </template>

      <!-- Multiple Facilities -->
      <template v-else>

        <RadioButtonGroup
          :items="facilities"
          :currentValue.sync="selectedFacilityId"
          :itemLabel="x => formatNameAndId(x.name, x.id)"
          :itemValue="x => x.id"
        >
          <template #underbutton="{ selected }">
            <FacilityAdminCredentialsForm
              v-if="selectedFacilityId === selected.id"
              ref="credentials"
              :facility="selected"
              :device="device"
              :shouldValidate="shouldValidate"
            />
          </template>
        </RadioButtonGroup>
      </template>
    </div>
  </OnboardingForm>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import {
    FacilityAdminCredentialsForm,
    RadioButtonGroup,
  } from 'kolibri.coreVue.componentSets.sync';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';

  export default {
    name: 'SelectFacilityForm',
    components: {
      FacilityAdminCredentialsForm,
      RadioButtonGroup,
      OnboardingForm,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    props: {
      device: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        selectedFacilityId: '',
        facilities: [],
        shouldValidate: false,
      };
    },
    computed: {
      header() {
        if (this.facilities.length > 1) {
          return this.getCommonSyncString('selectFacilityTitle');
        } else {
          return this.getCommonSyncString('importFacilityAction');
        }
      },
      formDescription() {
        return this.$tr('commaSeparatedPair', {
          first: this.formatNameAndId(this.device.name, this.device.id),
          second: this.device.address,
        });
      },
    },
    beforeMount() {
      this.fetchNetworkLocationFacilities(this.$route.query.address_id)
        .then(data => {
          this.facilities = [...data.facilities];
          this.$emit('update:device', {
            name: data.device_name,
            id: data.device_id,
            address: data.device_address,
          });
          if (this.facilities.length === 1) {
            this.selectedFacilityId = this.facilities[0].id;
          }
        })
        .catch(error => {
          // TODO handle disconnected peers error more gracefully
          this.$store.dispatch('showError', error);
        });
    },
    methods: {
      handleSubmit() {
        // Credentials form implement authentication logic and returns a Promise<Boolean>
        this.callSubmitCredentials().then(isSuccess => {
          if (isSuccess) {
            this.$emit('click_next');
          }
        });
      },
      callSubmitCredentials() {
        const $credentials = this.$refs.credentials;
        if ($credentials) {
          return $credentials.submitCredentials();
        } else {
          return Promise.resolve(false);
        }
      },
    },
    $trs: {
      commaSeparatedPair: '{first}, {second}',
    },
  };

</script>


<style lang="scss" scoped>

  .radio-button {
    margin: 16px 0;
  }

</style>
