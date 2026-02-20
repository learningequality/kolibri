<template>

  <OnboardingForm :header="$tr('gettingStartedHeader')">
    <p class="p1">
      {{ $tr('descriptionParagraph1') }}
    </p>
    <p class="p2">
      {{ $tr('descriptionParagraph2') }}
    </p>

    <template #buttons>
      <KButton
        class="left-button"
        :text="$tr('configureFacilityAction')"
        appearance="raised-button"
        primary
        @click="goToPublicSetup"
      />
      <KButton
        :text="$tr('skipAction')"
        appearance="flat-button"
        @click="goToPersonalSetup"
      />
    </template>
  </OnboardingForm>

</template>


<script>

  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { Presets } from 'kolibri/constants';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'GettingStartedFormAlt',
    components: {
      OnboardingForm,
    },
    mixins: [commonSyncElements],
    methods: {
      goToPersonalSetup() {
        this.$store.commit('SET_FACILITY_PRESET', Presets.PERSONAL);
        this.$router.push({
          name: 'PERSONAL_SETUP',
        });
      },
      goToPublicSetup() {
        this.$store.commit('SET_FACILITY_PRESET', '');
        this.$router.push({
          name: 'DEVICE_NAME',
        });
      },
    },
    $trs: {
      gettingStartedHeader: {
        message: 'How do you plan to use Kolibri?',
        context: 'Page title',
      },
      descriptionParagraph1: {
        message:
          'In Kolibri, you can use a facility to manage a large group of users, like a school, an educational program or any other group learning setting. You can also have multiple facilities on the same device.',

        context: 'First paragraph of description.',
      },
      descriptionParagraph2: {
        message: 'Would you like to configure a facility?',
        context: 'Second paragraph of description.',
      },
      configureFacilityAction: {
        message: 'Configure facility',
        context: 'Option that takes user to more advanced facility configuration steps.',
      },
      skipAction: {
        message: 'Skip',
        context: 'Button that lets users skip more advanced setup steps',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .p1 {
    margin-top: 0;
  }

  .p2 {
    margin-bottom: 0;
  }

  .left-button {
    margin-left: 0;
  }

</style>
