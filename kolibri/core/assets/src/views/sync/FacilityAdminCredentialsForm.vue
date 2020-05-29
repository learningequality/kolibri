<template>

  <div>
    <p v-if="singleFacility" class="facility-name">
      {{ formatNameAndId(facility.name, facility.id) }}
    </p>
    <p>
      {{ prompt }}
    </p>

    <p v-if="error" class="error">
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
    />
    <PasswordTextbox
      ref="password"
      :value.sync="password"
      :isValid.sync="passwordValid"
      :shouldValidate="shouldValidate"
      :showConfirmationInput="false"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';

  function mockResponse(fail = false) {
    return fail ? Promise.reject() : Promise.resolve();
  }

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
        if (this.singleFacility) {
          return this.$tr('adminCredentialsPromptOneFacility', {
            device: this.device.name,
          });
        } else {
          return this.$tr('adminCredentialsPromptMultipleFacilities', {
            facility: this.facility.name,
            device: this.device.name,
          });
        }
      },
      formIsValid() {
        return this.passwordValid && this.usernameValid;
      },
    },
    methods: {
      // @public. Returns Promise<Boolean>
      submitCredentials() {
        this.shouldValidate = true;
        if (this.formIsValid) {
          return mockResponse()
            .then(() => {
              return true;
            })
            .catch(() => {
              this.error = true;
              return false;
            });
        } else {
          if (!this.usernameValid) {
            this.$refs.username.focus();
          } else {
            this.$refs.password.focus();
          }
          return Promise.resolve(false);
        }
      },
    },
    $trs: {
      // Use this version in Device > Facilities
      adminCredentialsPromptMultipleFacilities: {
        message:
          "Enter the username and password for a facility admin of '{facility}' or a super admin of '{device}'",
        context:
          '\n        Menu description text: users must provide the facility admin credentials\n        for a selected source facility, or super admin credentials for the source\n        device, before they are able to import\n      ',
      },
      adminCredentialsPromptOneFacility: {
        message:
          "Enter the username and password for a facility admin or a super admin of '{device}'",
        context: 'Alternative phrasing for the facility admin credentials prompt',
      },
      duplicateFacilityNamesExplanation: {
        message: "This facility is different from '{facilities}'. These facilities will not sync.",
        context: 'Explanation that is shown if two facilities with the same name are on the device',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .facility-name {
    font-weight: bold;
  }

  .error {
    color: red;
  }

</style>
