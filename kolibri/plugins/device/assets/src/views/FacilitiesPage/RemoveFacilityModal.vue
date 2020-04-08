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
        v-model="confirmationChecked"
        :label="$tr('removingFacilityConfirmation')"
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
        return this.canRemove ? this.coreString('removeAction') : this.coreString('cancelAction');
      },
      submitDisabled() {
        return this.canRemove ? this.confirmationChecked : false;
      },
      cancelText() {
        return this.coreString('removeAction');
      },
      facilityName() {
        return this.coreString('nameWithIdInParens', {
          name: 'Price Center',
          id: 'B91D',
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
      removeFacilityHeader: 'Remove facility from this device',
      cannotRemoveFacilityHeader: 'Cannot remove facility',
      willLoseAccessWarning: `You will lose access to all '{facilityName}' data`,
      facilityReloadExplanation:
        'If you have synced this facility to Kolibri Data Portal or to another device on your local network, you may be able to load it back to this device',
      removingFacilityConfirmation: 'I understand the consequences of removing the facility',
      cannotRemoveOwnFacilityExplanation:
        'Super admins cannot remove facilities they are a member of',
      signInAsOtherAdminExplanation: `You must sign in as a super admin of a facility different from '{facilityName}' in order to remove it from this device`,
    },
  };

</script>


<style lang="scss" scoped>

  .warning {
    color: #df0f0f;
  }

</style>
