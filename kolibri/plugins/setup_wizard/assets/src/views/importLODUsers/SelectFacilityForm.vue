<template>

  <OnboardingForm
    :header="header"
    :description="formDescription"
    :disabled="selectedFacilityId === ''"
    @submit="handleNext"
  >
    <RadioButtonGroup
      :items="facilities"
      :currentValue.sync="selectedFacilityId"
      :itemLabel="x => formatNameAndId(x.name, x.id)"
      :itemValue="x => x.id"
      :disabled="false"
    />
  </OnboardingForm>

</template>


<script>

  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { RadioButtonGroup } from 'kolibri.coreVue.componentSets.sync';
  import OnboardingForm from '../onboarding-forms/OnboardingForm';

  export default {
    name: 'SelectFacilityForm',
    components: {
      RadioButtonGroup,
      OnboardingForm,
    },
    mixins: [commonSyncElements],
    data() {
      return {
        selectedFacilityId: '',
      };
    },
    inject: ['lodService', 'state'],
    computed: {
      facilities() {
        return this.state.value.facilities;
      },
      device() {
        return this.state.value.device;
      },
      header() {
        return this.getCommonSyncString('selectFacilityTitle');
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
    methods: {
      handleNext() {
        this.lodService.send({
          type: 'CONTINUE',
          value: { device: null, facility: this.selectedFacility },
        });
      },
    },
    $trs: {
      commaSeparatedPair: {
        message: '{first}, {second}',
        context: 'DO NOT TRANSLATE\nCopy the source string.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .radio-button {
    margin: 16px 0;
  }

</style>
