<template>

  <KPageContainer class="narrow-container">
    <form class="form" @submit.prevent="handleSubmit">
      <h1>{{ $tr('editProfileHeader') }}</h1>

      <TextboxFullName
        ref="textboxFullName"
        :autofocus="true"
        :disabled="!canEditName || busy"
        :value.sync="fullName"
        :isValid.sync="fullNameValid"
        :shouldValidate="formSubmitted"
      />

      <TextboxUsername
        ref="textboxUsername"
        :disabled="!canEditUsername || busy"
        :value.sync="username"
        :isValid.sync="usernameValid"
        :shouldValidate="formSubmitted"
        :errors.sync="caughtErrors"
      />

      <SelectGender
        class="select"
        :value.sync="gender"
        :disabled="busy"
      />

      <SelectBirthYear
        class="select"
        :value.sync="birthYear"
        :disabled="busy"
      />

      <div class="buttons">
        <KButton
          class="no-margin"
          :text="$tr('saveAction')"
          :disabled="busy"
          type="submit"
          primary
        />
        <KButton
          :text="$tr('cancelAction')"
          :disabled="busy"
          appearance="raised-button"
          :primary="false"
          @click="$router.push($router.getRoute('PROFILE'))"
        />
      </div>
    </form>
  </KPageContainer>

</template>


<script>

  import some from 'lodash/some';
  import { mapGetters } from 'vuex';
  import KButton from 'kolibri.coreVue.components.KButton';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import SelectGender from 'kolibri.coreVue.components.SelectGender';
  import SelectBirthYear from 'kolibri.coreVue.components.SelectBirthYear';
  import TextboxFullName from 'kolibri.coreVue.components.TextboxFullName';
  import TextboxUsername from 'kolibri.coreVue.components.TextboxUsername';

  export default {
    name: 'ProfileEditPage',
    metaInfo() {
      return {
        title: this.$tr('editProfileHeader'),
      };
    },
    components: {
      KButton,
      KPageContainer,
      SelectGender,
      SelectBirthYear,
      TextboxFullName,
      TextboxUsername,
    },
    props: {},
    data() {
      const { username, full_name } = this.$store.state.core.session;
      return {
        fullName: full_name,
        fullNameValid: true,
        username: username,
        usernameValid: true,
        birthYear: null,
        gender: null,
        busy: false,
        caughtErrors: [],
        formSubmitted: false,
      };
    },
    computed: {
      ...mapGetters(['facilityConfig', 'isCoach', 'isLearner']),
      canEditName() {
        if (this.isLearner || this.isCoach) {
          return this.facilityConfig.learner_can_edit_name;
        }
        return true;
      },
      canEditUsername() {
        if (this.isLearner || this.isCoach) {
          return this.facilityConfig.learner_can_edit_username;
        }
        return true;
      },
      formIsValid() {
        return !some([!this.fullNameValid, this.usernameIsInvalidText], Boolean);
      },
    },
    methods: {
      handleSubmit() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.busy = true;
          this.$store
            .dispatch('profile/updateUserProfile', {
              edits: {
                username: this.username,
                full_name: this.fullName,
                // gender: this.gender,
                // birth_year: this.birthYear,
              },
              session: this.$store.state.core.session,
            })
            .then(() => {
              this.busy = false;
              this.$store.dispatch('createSnackbar', this.$tr('updateSuccessNotification'));
            })
            .catch(error => {
              this.busy = false;
              const caughtErrors = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
              if (caughtErrors.length === 0) {
                this.$store.dispatch('handleApiError', error, { root: true });
              } else {
                this.caughtErrors = caughtErrors;
                this.focusOnInvalidField();
              }
            });
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.fullNameValid) {
            this.$refs.textboxFullName.focus();
          } else if (!this.usernameValid) {
            this.$refs.textboxUsername.focus();
          }
        });
      },
    },
    $trs: {
      cancelAction: 'Cancel',
      editProfileHeader: 'Edit profile',
      saveAction: 'Save',
      updateSuccessNotification: 'Profile details updated',
    },
  };

</script>


<style lang="scss" scoped>

  .narrow-container {
    width: 500px;
    margin: auto;
  }

  .form {
    max-width: 400px;
    margin: auto;
  }

  .buttons {
    margin: 36px 0 18px;

    button:first-of-type {
      margin-left: 0;
    }
  }

  .select {
    margin: 18px 0 36px;
  }

</style>
