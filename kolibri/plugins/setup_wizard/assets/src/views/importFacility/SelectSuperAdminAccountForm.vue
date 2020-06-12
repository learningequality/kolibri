<template>

  <SuperuserCredentialsForm
    v-if="!loading"
    :header="$tr('header')"
    :description="$tr('description')"
    :uniqueUsernameValidator="uniqueUsernameValidator"
    @click_next="handleClickNext"
  >
    <template v-slot:aboveform>
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
      v-slot:form
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
      selected() {
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
      fetchFacilityAdmins() {
        this.$store
          .dispatch('getFacilityAdmins')
          .then(admins => {
            this.facilityAdmins = [...admins];
            this.selected = { ...this.dropdownOptions[0] };
            this.loading = false;
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
      resetFormAndRefocus() {
        this.shouldValidate = false;
        if (this.$refs.password) {
          this.$refs.password.resetAndFocus();
        }
      },
      grantPermissions() {
        this.error = false;
        if (!this.passwordValid) {
          this.$refs.password.focus();
          return;
        }
        this.$store
          .dispatch('grantSuperuserPermissions', {
            user_id: this.selected.value,
            password: this.password,
          })
          .then(() => {
            this.$emit('update:superuser', {
              username: this.selected.label,
              password: this.password,
            });
            this.$emit('click_next');
          })
          .catch(() => {
            this.error = true;
          });
      },
      createSuperuser(data) {
        return this.$store
          .dispatch('createSuperuser', data)
          .then(() => {
            this.$emit('update:superuser', {
              username: data.username,
              password: data.password,
            });
            this.$emit('click_next');
          })
          .catch(() => {
            this.error = true;
          });
      },
      handleClickNext(data) {
        this.shouldValidate = true;
        if (this.importedUserIsSelected) {
          this.grantPermissions();
        } else {
          this.createSuperuser(data);
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
