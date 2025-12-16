<template>

  <KModal
    :title="$tr('createFacilityLabel')"
    :submitText="$tr('createFacilityButtonLabel')"
    :cancelText="coreString('closeAction')"
    size="medium"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <p>{{ coreString('learningFacilityDescription') }}</p>
    <KTextbox
      ref="facilityNameTextBox"
      v-model="facilityName"
      :label="$tr('facilityNameFieldLabel')"
      :invalid="facilityNameInvalid"
      :invalidText="coreString('requiredFieldError')"
      :maxlength="50"
    />
    <b>{{ $tr('learningEnvironmentHeader') }}</b>
    <KRadioButton
      v-model="preset"
      class="permission-preset-radio-button"
      :buttonValue="Presets.NONFORMAL"
      :label="$tr('nonFormalLabel')"
      :description="$tr('nonFormalDescription')"
    />
    <KRadioButton
      v-model="preset"
      class="permission-preset-radio-button"
      :buttonValue="Presets.FORMAL"
      :label="$tr('formalLabel')"
      :description="$tr('formalDescription')"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { Presets } from 'kolibri/constants';
  import { createFacility } from './api';

  export default {
    name: 'CreateNewFacilityModal',
    mixins: [commonCoreStrings, commonSyncElements],
    data() {
      return {
        facilityName: '',
        preset: Presets.NONFORMAL,
        Presets,
      };
    },
    computed: {
      facilityNameInvalid() {
        return !this.facilityName || this.facilityName.trim() === '';
      },
    },
    methods: {
      handleSubmit() {
        if (this.facilityNameInvalid) {
          return this.$refs.facilityNameTextBox.focus();
        }
        const payload = {
          name: this.facilityName,
          preset: this.preset,
        };
        createFacility(payload)
          .then(() => {
            this.$emit('success');
            this.showSnackbarNotification('newLearningFacilityCreated');
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
    },
    $trs: {
      facilityNameFieldLabel: {
        message: 'Learning facility name',
        context: 'The field where the admin adds the name of their facility.',
      },
      learningEnvironmentHeader: {
        message: 'What kind of environment is your facility?',
        context: 'Title for facility environment.',
      },
      formalLabel: {
        message: 'Formal',
        context: 'Label for the radio button option in the facility setup.',
      },
      formalDescription: {
        message: 'Schools and other formal learning contexts.',
        context: "Option description text for 'Formal' facility types.",
      },
      nonFormalLabel: {
        message: 'Non-formal',
        context: 'Label for the radio button option in the facility setup',
      },
      nonFormalDescription: {
        message:
          'Libraries, orphanages, youth centers, computer labs, and other non-formal learning contexts.',

        context: "Option description text for 'Non-formal' facility types.",
      },
      createFacilityLabel: {
        message: 'Create a new learning facility',
        context: 'Title for create facility modal',
      },
      createFacilityButtonLabel: {
        message: 'Create facility',
        context: 'Label for create facility submit button.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
