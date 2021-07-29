<template>

  <OnboardingForm
    :header="header"
    :description="formDescription"
    :disabled="selectedFacilityId === '' || formDisabled"
    @submit="handleCredentialsSubmit"
  >
    <!-- Only one Facility -->
    <template v-if="singleFacility">
      <FacilityAdminCredentialsForm
        ref="credentialsForm"
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
        :disabled="formDisabled"
      >
        <template #underbutton="{ selected }">
          <FacilityAdminCredentialsForm
            v-if="selectedFacilityId === selected.id"
            ref="credentialsForm"
            :facility="selected"
            :device="device"
            :shouldValidate="shouldValidate"
            :disabled="formDisabled"
          />
        </template>
      </RadioButtonGroup>
    </template>
  </OnboardingForm>

</template>


<script>

  import isString from 'lodash/isString';
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
        validator(val) {
          return isString(val.name) && isString(val.id) && isString(val.baseurl);
        },
      },
    },
    data() {
      return {
        // Need to initialize to non-empty string to fix #7595
        selectedFacilityId: 'selectedFacilityId',
        facilities: [],
        shouldValidate: false,
        formDisabled: false,
      };
    },
    computed: {
      singleFacility() {
        return this.facilities.length === 1;
      },
      header() {
        if (this.singleFacility) {
          return this.getCommonSyncString('importFacilityAction');
        } else {
          return this.getCommonSyncString('selectFacilityTitle');
        }
      },
      formDescription() {
        if (this.device.name) {
          return this.$tr('commaSeparatedPair', {
            first: this.formatNameAndId(this.device.name, this.device.id),
            second: this.device.baseurl,
          });
        }
        return '';
      },
      selectedFacility() {
        return this.facilities.find(f => f.id === this.selectedFacilityId);
      },
    },
    beforeMount() {
      this.fetchNetworkLocationFacilities(this.$route.query.device_id)
        .then(data => {
          this.facilities = [...data.facilities];
          this.$emit('update:device', {
            name: data.device_name,
            id: data.device_id,
            baseurl: data.device_address,
          });
          if (this.singleFacility) {
            this.selectedFacilityId = this.facilities[0].id;
          }
        })
        .catch(error => {
          // TODO handle disconnected peers error more gracefully
          this.$store.dispatch('showError', error);
        });
    },
    methods: {
      handleCredentialsSubmit() {
        this.formDisabled = true;
        this.callSubmitCredentials().then(data => {
          if (data) {
            this.$emit('update:facility', {
              name: this.selectedFacility.name,
              id: this.selectedFacility.id,
              username: data.username,
              password: data.password,
            });
            this.$emit('click_next');
          } else {
            this.formDisabled = false;
          }
        });
      },
      callSubmitCredentials() {
        const $credentialsForm = this.$refs.credentialsForm;
        if ($credentialsForm) {
          // The form makes the call to the startpeerfacilityimport endpoint
          return $credentialsForm.startImport().then(importStarted => {
            if (importStarted) {
              return {
                username: $credentialsForm.username,
                password: $credentialsForm.password,
              };
            } else {
              return false;
            }
          });
        } else {
          return Promise.resolve(false);
        }
      },
    },
    $trs: {
      commaSeparatedPair: {
        message: '{first}, {second}',
        context: 'DO NOT TRANSLATE.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .radio-button {
    margin: 16px 0;
  }

</style>
