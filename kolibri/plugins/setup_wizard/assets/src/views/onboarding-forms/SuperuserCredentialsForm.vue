<template>

  <OnboardingStepBase
    dir="auto"
    :title="$attrs.header || $tr('adminAccountCreationHeader')"
    :description="$attrs.description || $tr('adminAccountCreationDescription')"
    @continue="handleContinue"
  >
    <slot name="aboveform"></slot>

    <!-- HACK in Import mode, this slot will be replaced by Password-only form -->
    <!-- VUE3-COMPAT: linter doesn't like that we are injecting "footer" slot from
         inside a slot default
    -->
    <slot name="form">
      <FullNameTextbox
        ref="fullNameTextbox"
        :value.sync="fullName"
        :isValid.sync="fullNameValid"
        :shouldValidate="formSubmitted"
        :autofocus="true"
        autocomplete="name"
      />

      <UsernameTextbox
        ref="usernameTextbox"
        :value.sync="username"
        :isValid.sync="usernameValid"
        :shouldValidate="formSubmitted"
        :isUniqueValidator="uniqueUsernameValidator"
      />

      <PasswordTextbox
        ref="passwordTextbox"
        :value.sync="password"
        :isValid.sync="passwordValid"
        :shouldValidate="formSubmitted"
        autocomplete="new-password"
      />

      <!-- NOTE: Demographic info forms were removed in PR #6053 -->

      <PrivacyLinkAndModal v-if="!hidePrivacyLink" />

    </slot>

    <slot name="footer">
      <div class="reminder">
        <div class="icon">
          <KIcon icon="warning" />
        </div>
        <p class="text">
          {{ coreString('rememberThisAccountInformation') }}
        </p>
      </div>
    </slot>
  </OnboardingStepBase>

</template>


<script>

  import every from 'lodash/every';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import PrivacyLinkAndModal from 'kolibri.coreVue.components.PrivacyLinkAndModal';
  import OnboardingStepBase from '../OnboardingStepBase';
  import { UsePresets } from '../../constants';
  import { FacilityImportResource } from '../../api';

  export default {
    name: 'SuperuserCredentialsForm',
    components: {
      OnboardingStepBase,
      FullNameTextbox,
      UsernameTextbox,
      PasswordTextbox,
      PrivacyLinkAndModal,
    },
    mixins: [commonCoreStrings],
    inject: ['wizardService'],
    props: {
      uniqueUsernameValidator: {
        type: Function,
        default: null,
      },
      hidePrivacyLink: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      const { superuser } = this.$store.state.onboardingData;
      return {
        fullName: superuser.full_name,
        fullNameValid: false,
        username: superuser.username,
        usernameValid: false,
        password: superuser.password,
        passwordValid: false,
        formSubmitted: false,
      };
    },
    computed: {
      formIsValid() {
        return every([this.usernameValid, this.fullNameValid, this.passwordValid]);
      },
    },
    methods: {
      isOnMyOwnSetup() {
        return this.wizardService.state.context.onMyOwnOrGroup == UsePresets.ON_MY_OWN;
      },
      handleContinue() {
        /**
         * Partially provision the device
         * Create SuperUser
         * Continue
         * TODO: Not sure "Facility" and "Device" are the best default names here -- will need to
         * get the OS user's info I think.
         */
        const facilityUserData = {
          fullName: this.fullName,
          username: this.username,
          password: this.password,
          facility_name: this.$store.state.onboardingData.facility.name,
          extra_fields: {
            on_my_own_setup: this.isOnMyOwnSetup(),
          },
        };
        if (this.formIsValid) {
          return FacilityImportResource.createsuperuser(facilityUserData)
            .then(() => {
              const deviceProvisioningData = {
                device_name: this.wizardService.state.context.deviceName,
                language_id: this.$store.state.onboardingData.language_id,
                is_provisioned: true,
              };
              FacilityImportResource.provisiondevice(deviceProvisioningData).then(() =>
                this.wizardService.send('CONTINUE')
              );
            })
            .catch(e => {
              throw new Error(`Error creating superuser: ${e}`);
            });
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.fullNameValid) {
            this.$refs.fullNameTextbox.focus();
          } else if (!this.usernameValid) {
            this.$refs.usernameTextbox.focus();
          } else if (!this.passwordValid) {
            this.$refs.passwordTextbox.focus();
          }
        });
      },
    },
    $trs: {
      adminAccountCreationHeader: {
        message: 'Create super admin',
        context:
          "The title of the 'Create a super admin account' section. A super admin can manage all the content and all other Kolibri users on the device.",
      },
      adminAccountCreationDescription: {
        message:
          'This account allows you to manage the facility, resources, and user accounts on this device',
        context: "Description of the 'Create super admin account' page.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .reminder {
    display: table;
    max-width: 480px;
    padding-top: 1em;

    .icon {
      display: table-cell;
      width: 5%;
      min-width: 32px;
    }

    .text {
      display: table-cell;
      width: 90%;
      vertical-align: top;
    }
  }

  .select {
    margin: 18px 0 36px;
  }

</style>
