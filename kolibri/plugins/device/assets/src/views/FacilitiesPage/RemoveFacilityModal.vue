<template>

  <KModal
    :title="header"
    :cancelText="cancelText"
    :submitText="submitText"
    :submitDisabled="submitDisabled"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <!-- Can Remove Facility state -->
    <template v-if="canRemove">
      <p :style="{ color: $themeTokens.error }">
        {{ $tr('willLoseAccessWarning', { facilityName }) }}
      </p>
      <p>
        {{ $tr('facilityReloadExplanation') }}
      </p>
      <!-- Insert checkbox -->
      <KCheckbox
        :checked="confirmationChecked"
        :label="$tr('removingFacilityConfirmation')"
        @change="confirmationChecked = $event"
      />
    </template>

    <!-- Cannot Remove Facility state -->
    <template v-else>
      <p>
        {{ $tr('cannotRemoveOwnFacilityExplanation') }}
      </p>
      <p>
        {{ $tr('signInAsOtherAdminExplanation', { facilityName }) }}
      </p>
    </template>
  </KModal>

</template>


<script>

  import TaskResource from 'kolibri/apiResources/TaskResource';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
  import useUser from 'kolibri/composables/useUser';

  export default {
    name: 'RemoveFacilityModal',
    mixins: [commonCoreStrings, commonSyncElements],
    setup() {
      const { session } = useUser();
      return { session };
    },
    props: {
      facility: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        confirmationChecked: false,
      };
    },
    computed: {
      header() {
        return this.canRemove
          ? this.$tr('removeFacilityHeader')
          : this.$tr('cannotRemoveFacilityHeader');
      },
      submitText() {
        return this.canRemove ? this.coreString('removeAction') : null;
      },
      submitDisabled() {
        return this.canRemove ? !this.confirmationChecked : true;
      },
      cancelText() {
        return this.canRemove ? this.coreString('cancelAction') : this.coreString('closeAction');
      },
      facilityName() {
        return this.formatNameAndId(this.facility.name, this.facility.id);
      },
      canRemove() {
        return this.session.facility_id !== this.facility.id;
      },
    },
    methods: {
      handleSubmit() {
        if (this.canRemove) {
          TaskResource.startTask({ type: TaskTypes.DELETEFACILITY, facility: this.facility.id })
            .then(data => {
              this.$emit('success', data.id);
            })
            .catch(error => {
              this.$store.dispatch('handleApiError', { error });
            });
        } else {
          this.$emit('cancel');
        }
      },
    },
    $trs: {
      removeFacilityHeader: {
        message: 'Remove facility from this device',
        context:
          'Title of the modal window where the user confirms the removal of a facility from the device',
      },
      cannotRemoveFacilityHeader: {
        message: 'Cannot remove facility',
        context: 'Title of the modal window if user is unable to remove the facility',
      },
      willLoseAccessWarning: {
        message: `You will lose access to all '{facilityName}' data.`,
        context: "Warning message on the 'Remove facility from this device' window.",
      },
      facilityReloadExplanation: {
        message:
          'If you have synced this facility to Kolibri Data Portal or to another device on your local network, you may be able to load it back to this device.',

        context: 'Modal description text when removing a facility that has previously been synced',
      },
      removingFacilityConfirmation: {
        message: 'I understand the consequences of removing the facility',
        context: "Confirmation message on the 'Remove facility from this device' window.",
      },
      cannotRemoveOwnFacilityExplanation: {
        message: 'Super admins cannot remove facilities they are a member of.',
        context: 'Modal description text.',
      },
      signInAsOtherAdminExplanation: {
        message:
          "You cannot remove the facility that your user is a member of. To remove '{facilityName}', create a super admin in a different facility and sign in as them.",

        context: 'Modal description text',
      },
    },
  };

</script>
