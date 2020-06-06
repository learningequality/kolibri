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
      <p class="warning">
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

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'RemoveFacilityModal',
    components: {},
    mixins: [commonCoreStrings],
    props: {
      canRemove: {
        type: Boolean,
        required: true,
      },
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
        return this.coreString('nameWithIdInParens', {
          name: this.facility.name,
          id: this.facility.id.slice(0, 4),
        });
      },
    },
    methods: {
      handleSubmit() {
        if (this.canRemove) {
          this.$emit('submit');
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
        context: '',
      },
      facilityReloadExplanation: {
        message:
          'If you have synced this facility to Kolibri Data Portal or to another device on your local network, you may be able to load it back to this device.',
        context: 'Modal description text when removing a facility that has previously been synced',
      },
      removingFacilityConfirmation: {
        message: 'I understand the consequences of removing the facility',
        context: '',
      },
      cannotRemoveOwnFacilityExplanation: {
        message: 'Super admins cannot remove facilities they are a member of.',
        context: 'Modal description text',
      },
      signInAsOtherAdminExplanation: {
        message:
          "You must sign in as a super admin of a facility different from '{facilityName}' in order to remove it from this device.",
        context: 'Modal description text',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .warning {
    color: #df0f0f;
  }

</style>
