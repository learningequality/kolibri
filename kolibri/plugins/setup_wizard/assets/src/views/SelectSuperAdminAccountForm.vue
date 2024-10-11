<template>

  <UserCredentialsForm
    v-if="!loading"
    :footerMessageType="footerMessageType"
    :step="step"
    :steps="steps"
    :header="$tr('header')"
    :description="getCommonSyncString('superAdminPermissionsDescription')"
    :uniqueUsernameValidator="uniqueUsernameValidator"
    :selectedUser="selectedImportedUser"
    :noBackAction="true"
    @submit="handleClickNext"
  >
    <template #aboveform>
      <p
        v-if="error"
        :style="{ color: $themeTokens.error }"
      >
        {{ coreString('invalidCredentialsError') }}
      </p>
      <p>
        {{
          $tr('chooseAdminPrompt', {
            facility: facility.name,
          })
        }}
      </p>
      <KSelect
        v-model="selected"
        class="select"
        :label="coreString('superAdminLabel')"
        :options="dropdownOptions"
      />

      <!-- Prompt that shows when full superuser form is showing -->
      <p v-if="!importedUserIsSelected">
        {{ $tr('accountFacilityExplanation', { facility: facility.name }) }}
      </p>
    </template>

    <p v-if="importedUserIsSelected">
      {{ $tr('enterPasswordPrompt', { username: selected.label, facility_name: facility.name }) }}
    </p>
  </UserCredentialsForm>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { FacilityImportResource } from '../api';
  import { FooterMessageTypes } from '../constants';
  import UserCredentialsForm from './onboarding-forms/UserCredentialsForm';

  const CREATE_NEW_SUPER_ADMIN = 'CREATE_NEW_SUPER_ADMIN';

  export default {
    name: 'SelectSuperAdminAccountForm',
    components: {
      UserCredentialsForm,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    inject: ['wizardService'],
    data() {
      const footerMessageType = FooterMessageTypes.IMPORT_FACILITY;
      return {
        footerMessageType,
        selected: {},
        password: '',
        passwordValid: false,
        shouldValidate: false,
        loading: true,
        error: false,
        facilityAdmins: [],
      };
    },
    computed: {
      // If there is only one facility we skipped a step, so we're on step 1
      step() {
        return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 3 : 4;
      },
      // If there is only one facility we skipped a step, so we only have 4 steps
      steps() {
        return this.wizardService.state.context.facilitiesOnDeviceCount == 1 ? 4 : 5;
      },
      facility() {
        return this.wizardService._state.context.selectedFacility;
      },
      selectedImportedUser() {
        return this.facilityAdmins.find(admin => admin.id == this.selected.value);
      },
      importedUserIsSelected() {
        return this.selected.value !== CREATE_NEW_SUPER_ADMIN;
      },
      dropdownOptions() {
        const adminOptions = this.facilityAdmins.map(admin => ({
          label: admin.username,
          value: admin.id,
        }));
        return [
          ...adminOptions,
          {
            label: this.$tr('createSuperAdminOption'),
            value: CREATE_NEW_SUPER_ADMIN,
          },
        ];
      },
    },
    watch: {
      selected(newVal) {
        // If the previously-saved admin is chosen, auto-fill their password
        if (newVal.label === this.facility.username) {
          this.setSavedAdminPassword();
        }
      },
    },
    beforeMount() {
      this.fetchFacilityAdmins();
    },
    methods: {
      uniqueUsernameValidator(username) {
        return !this.facilityAdmins.find(admin => admin.username === username);
      },
      setSavedAdminPassword() {
        this.password = this.facility.password;
      },
      fetchFacilityAdmins() {
        return FacilityImportResource.facilityadmins()
          .then(admins => {
            this.facilityAdmins = [...admins];
            // NOTE: We don't have the facility user ID on hand to disambiguate if
            // a duplicate username is used
            const superuserMatch = this.dropdownOptions.find(
              ({ label }) => label === this.facility.username,
            );
            if (superuserMatch) {
              this.selected = superuserMatch;
              this.setSavedAdminPassword();
            } else {
              this.selected = this.dropdownOptions[0];
              this.password = '';
            }
            this.$nextTick().then(() => {
              this.resetFormAndRefocus();
            });
            this.loading = false;
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', { error });
          });
      },
      resetFormAndRefocus() {
        this.shouldValidate = false;
        if (this.$refs.passwordTextbox) {
          // If password was set to the facility.password in handler
          if (this.selected.label !== this.facility.username) {
            this.$refs.passwordTextbox.resetAndFocus();
          }
        }
      },
      handleClickNextImportedUser() {
        this.error = false;
        if (!this.passwordValid && 'passwordTextbox' in this.$refs) {
          this.$refs.passwordTextbox.focus();
          return;
        }
        return FacilityImportResource.grantsuperuserpermissions({
          user_id: this.selected.value,
          password: this.password,
        })
          .then(() => {
            this.updateSuperuserAndClickNext(this.selected.label, this.password);
          })
          .catch(() => {
            this.error = true;
          });
      },
      handleClickNextNewUser(data) {
        return FacilityImportResource.createsuperuser(data)
          .then(() => {
            this.updateSuperuserAndClickNext(data.username, data.password);
          })
          .catch(() => {
            this.error = true;
          });
      },
      updateSuperuserAndClickNext(username, password) {
        this.$emit('update:superuser', {
          username,
          password,
        });
        this.$emit('click_next');
      },
      handleClickNext(data) {
        this.shouldValidate = true;
        if (this.importedUserIsSelected) {
          this.handleClickNextImportedUser();
        } else {
          this.handleClickNextNewUser(data);
        }
      },
    },
    $trs: {
      header: {
        message: 'Select super admin',
        context: 'Page title,',
      },
      chooseAdminPrompt: {
        message: "Choose an admin from '{facility}' learning facility or create a new super admin.",
        context: 'Prompt that goes above a select input of options for admins',
      },
      enterPasswordPrompt: {
        message: "Enter the password for '{username}' in '{facility_name}' learning facility",
        context: 'Prompt that goes above the password input.',
      },
      createSuperAdminOption: {
        message: 'Create new super admin',
        context: 'Option in a select input.',
      },
      accountFacilityExplanation: {
        message: "This account will be associated with the facility '{facility}'",
        context: 'Explanation that goes above the new user form',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .select {
    max-width: 400px;
    margin: 24px 0;
  }

</style>
