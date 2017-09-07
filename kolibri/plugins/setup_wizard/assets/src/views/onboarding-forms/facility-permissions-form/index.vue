<template>

  <div>

    <!-- Cannot match spec with current core modal -->
    <!-- Should be its own component -->
    <core-modal
      :title=" $tr('facilityPermissionsPresetDetailsHeader')"
      @cancel="hideFacilityPermissionsDetails"
      :enableBgClickCancel="true"
      v-if="permissionPresetDetailsModalShown">

      <dl class="permission-preset-human">
        <dt class="permission-preset-human-title">
          {{ permissionPresets.formal.name }}
        </dt>
        <dd class="permission-preset-human-detail">
          {{ $tr('disabledUserSelfSignupPermissionDetail') }}
        </dd>
        <dd class="permission-preset-human-detail">
          {{ $tr('enabledUserPasswordlessLoginPermissionDetail') }}
        </dd>
        <dd class="permission-preset-human-detail">
          {{ $tr('disabledAccountEditPermissionDetail') }}
        </dd>
      </dl>

      <dl class="permission-preset-human">
        <dt class="permission-preset-human-title">
          {{ permissionPresets.informal.name }}
        </dt>
        <dd class="permission-preset-human-detail">
          {{ $tr('enabledUserSelfSignupPermissionDetail') }}
        </dd>
        <dd class="permission-preset-human-detail">
          {{ $tr('enabledAccountEditPermissionDetail') }}
        </dd>
      </dl>

      <dl class="permission-preset-human">
        <dt class="permission-preset-human-title">
          {{ permissionPresets.nonformal.name }}
        </dt>
        <dd class="permission-preset-human-detail">
          {{ $tr('enabledUserSelfSignupPermissionDetail') }}
        </dd>
        <dd class="permission-preset-human-detail">
          {{ $tr('enabledAccountEditPermissionDetail') }}
        </dd>
      </dl>

    </core-modal>

    <onboarding-form
      :header="$tr('facilityPermissionsSetupFormHeader')"
      :submit-text="submitText"
      @submit="setPermissions">

      <template slot="description">
        {{ $tr('facilityPermissionsSetupFormDescription') }}

        <a @click="showFacilityPermissionsDetails">
          {{ $tr('facilityPermissionsPresetDetailsLink') }}
        </a>
      </template>


      <template v-for="(preset, value) in permissionPresets">

        <label>
          <k-radio-button
          class="permission-preset"
          v-model="selectedPermissionPreset"
          :radiovalue="value"
          :label="preset.name"
          />
          <span class="permission-preset-description">
            {{ descriptions[value] }}
          </span>
        </label>

      </template>

    </onboarding-form>

  </div>

</template>


<script>

  import { permissionPresets } from '../../../state/constants';
  import { submitFacilityPermissions } from '../../../state/actions/forms';

  import onboardingForm from '../onboarding-form';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';

  // TODO add modal and link to open it

  export default {
    name: 'selectPermissionsForm',
    $trs: {
      facilityPermissionsSetupFormHeader: 'Choose a Facility setup',
      facilityPermissionsSetupFormDescription:
        'How will you be using Kolibri? You can customize ' + 'these settings later.',
      facilityPermissionsPresetDetailsLink: 'Setup details',
      facilityPermissionsPresetDetailsHeader: 'Facility setup details',
      adminManagedSetupDescription: 'For schools and other formal learning contexts',
      selfManagedSetupDescription:
        'For libraries, orphanages, correctional facilities, ' +
          'youth centers, computer labs, and other non-formal learning contexts',
      informalSetupDescription:
        'For parent-child learning, homeschooling, or supplementary ' + 'individual learning',
      // IDEA This should be a dynamically generated component, based on mappings
      enabledUserAccountDeletionPermissionDetail: 'Guests can create their own accounts',
      disabledUserAccountDeletionPermissionDetail: 'Admins must create all user accounts',
      enabledAccountEditPermissionDetail: 'Users can edit their account information', //  QUESTION might be worth using select?
      disabledAccountEditPermissionDetail: 'Users cannot edit their account information',
      enabledUserPasswordlessLoginPermissionDetail: 'Users can sign in without their passwords',
      enabledUserSelfSignupPermissionDetail: 'Guests can create their own accounts',
      disabledUserSelfSignupPermissionDetail: 'Admins must create all user accounts',
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    components: {
      onboardingForm,
      kRadioButton,
      coreModal,
    },
    data() {
      return {
        selectedPermissionPreset: this.currentPermissionPreset,
        permissionPresetDetailsModalShown: false,
        descriptions: {
          formal: this.$tr('adminManagedSetupDescription'),
          informal: this.$tr('selfManagedSetupDescription'),
          nonformal: this.$tr('informalSetupDescription'),
        },
        permissionsMappingsHuman: {},
        permissionPresets,
      };
    },
    methods: {
      setPermissions() {
        this.submitFacilityPermissions(this.selectedPermissionPreset);
        this.$emit('submit');
      },
      showFacilityPermissionsDetails() {
        this.permissionPresetDetailsModalShown = true;
      },
      hideFacilityPermissionsDetails() {
        this.permissionPresetDetailsModalShown = false;
      },
    },
    vuex: {
      actions: {
        submitFacilityPermissions,
      },
      getters: {
        currentPermissionPreset: state => state.onboardingData.preset,
      },
    },
  };

</script>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  .permission-preset
    margin-bottom: 16px
    font-size: 14px
    font-weight: bold

    &-description
      color: $core-text-annotation
      font-size: 12px

  .permission-preset-human
    list-style: none
    margin-bottom: 8px
    &-title
      font-weight: bold
    &-detail
      margin: 0

</style>