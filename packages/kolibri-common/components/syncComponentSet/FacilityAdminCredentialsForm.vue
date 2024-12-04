<template>

  <form>
    <p
      v-if="singleFacility && facility.name"
      class="facility-name"
    >
      {{ formatNameAndId(facility.name, facility.id) }}
    </p>
    <p>
      {{ prompt }}
    </p>

    <p
      v-if="error"
      :style="{ color: $themeTokens.error }"
    >
      {{ coreString('invalidCredentialsError') }}
    </p>
    <p v-if="false">
      {{ $tr('duplicateFacilityNamesExplanation') }}
    </p>

    <UsernameTextbox
      ref="username"
      :value.sync="username"
      :isValid.sync="usernameValid"
      :shouldValidate="shouldValidate"
      :autofocus="true"
      :disabled="$attrs.disabled"
    />
    <PasswordTextbox
      ref="password"
      :value.sync="password"
      :isValid.sync="passwordValid"
      :shouldValidate="shouldValidate"
      :showConfirmationInput="false"
      :disabled="$attrs.disabled"
    />
  </form>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import UsernameTextbox from 'kolibri-common/components/userAccounts/UsernameTextbox';
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';

  export default {
    name: 'FacilityAdminCredentialsForm',
    components: {
      UsernameTextbox,
      PasswordTextbox,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    props: {
      device: {
        type: Object,
        required: true,
        validator(val) {
          return val.name && val.id && val.baseurl;
        },
      },
      facility: {
        type: Object,
        required: true,
      },
      singleFacility: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        username: '',
        password: '',
        passwordValid: false,
        usernameValid: false,
        shouldValidate: false,
        error: false,
      };
    },
    computed: {
      prompt() {
        const deviceName = this.device.name;
        if (this.singleFacility) {
          return this.$tr('adminCredentialsPromptOneFacility', {
            device: deviceName,
          });
        } else {
          return this.$tr('adminCredentialsPromptMultipleFacilities', {
            facility: this.facility.name,
            device: deviceName,
          });
        }
      },
      formIsValid() {
        return this.passwordValid && this.usernameValid;
      },
    },
    methods: {
      /**
       * @public
       * @return {Promise<Boolean>}
       */
      startImport() {
        this.shouldValidate = true;
        if (this.formIsValid) {
          return this.startPeerImportTask({
            device_id: this.device.id,
            facility: this.facility.id,
            facility_name: this.facility.name,
            username: this.username,
            password: this.password,
          })
            .then(task => {
              return task.id;
            })
            .catch(() => {
              this.error = true;
              this.refocusForm();
              return false;
            });
        } else {
          this.refocusForm();
          return Promise.resolve(false);
        }
      },
      refocusForm() {
        this.$nextTick().then(() => {
          if (!this.usernameValid || this.error) {
            this.$refs.username.focus();
          } else if (!this.passwordValid) {
            this.$refs.password.focus();
          }
        });
      },
    },
    $trs: {
      // Use this version in Device > Facilities
      adminCredentialsPromptMultipleFacilities: {
        message:
          "Enter the username and password for a facility admin of '{facility}' or a super admin of '{device}'",

        context:
          'Menu description text: users must provide the facility admin credentials  for a selected source facility, or super admin credentials for the source device, before they are able to import.',
      },
      adminCredentialsPromptOneFacility: {
        message:
          "Enter the username and password for a facility admin or a super admin of '{device}'",

        context: 'Alternative phrasing for the facility admin credentials prompt',
      },
      duplicateFacilityNamesExplanation: {
        message: "This facility is different from '{facilities}'. These facilities will not sync.",
        context: 'Explanation displayed when two facilities with the same name are on the device',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .facility-name {
    font-weight: bold;
  }

</style>
