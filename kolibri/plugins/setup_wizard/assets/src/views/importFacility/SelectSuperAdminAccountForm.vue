<template>

  <SuperuserCredentialsForm
    v-if="!loading"
    :header="$tr('header')"
    :description="$tr('description')"
    :uniqueUsernameValidator="uniqueUsernameValidator"
    @click_next="handleClickNext"
  >
    <template #aboveform>
      <p v-if="error" class="error">
        {{ coreString('invalidCredentialsError') }}
      </p>
      <p>
        {{ $tr('chooseAdminPrompt', {
          facility: facility.name
        }) }}
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

    <!-- HACK
      Default form is replaced with this simpler form if an existing user
      is selected
   -->
    <template
      v-if="importedUserIsSelected"
      #form
    >
      <p>
        {{ $tr('enterPasswordPrompt', { username: selected.label }) }}
      </p>
      <!--
        NOTE: This PasswordTextbox needs a key so the default form
        doesn't re-use it
     -->
      <PasswordTextbox
        key="altpw"
        ref="password"
        :value.sync="password"
        :isValid.sync="passwordValid"
        :shouldValidate.sync="shouldValidate"
        :showConfirmationInput="false"
        :autofocus="true"
        autocomplete="password"
      />
    </template>
  </SuperuserCredentialsForm>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import SuperuserCredentialsForm from '../onboarding-forms/SuperuserCredentialsForm';
  import { FacilityImportResource } from '../../api';

  const CREATE_NEW_SUPER_ADMIN = 'CREATE_NEW_SUPER_ADMIN';

  export default {
    name: 'SelectSuperAdminAccountForm',
    components: {
      PasswordTextbox,
      SuperuserCredentialsForm,
    },
    mixins: [commonCoreStrings],
    props: {
      facility: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
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
        this.resetFormAndRefocus();
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
              ({ label }) => label === this.facility.username
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
            this.$store.dispatch('handleApiError', error);
          });
      },
      resetFormAndRefocus() {
        this.shouldValidate = false;
        if (this.$refs.password) {
          // If password was set to the facility.password in handler
          if (this.selected.label !== this.facility.username) {
            this.$refs.password.resetAndFocus();
          }
        }
      },
      handleClickNextImportedUser() {
        this.error = false;
        if (!this.passwordValid) {
          this.$refs.password.focus();
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
        message: 'Select super admin account',
        context: 'Page title,',
      },
      description: {
        message:
          'This account allows you to manage all facilities, content, and user accounts on this device.',

        context: 'Explanation of what the super admin account is used for on device',
      },
      chooseAdminPrompt: {
        message: "Choose an admin from '{facility}' or create a new super admin.",
        context: 'Prompt that goes above a select input of options for admins',
      },
      enterPasswordPrompt: {
        message: "Enter the password for '{username}'",
        context: 'Prompt that goes above the password input',
      },
      createSuperAdminOption: {
        message: 'Create new super admin',
        context: 'Option in a select input',
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

  .error {
    color: red;
  }

</style>
