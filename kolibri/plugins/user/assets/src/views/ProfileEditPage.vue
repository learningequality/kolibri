<template>

  <KPageContainer class="narrow-container">
    <form class="form" @submit.prevent="handleSubmit">
      <h1>{{ $tr('editProfileHeader') }}</h1>
      <KTextbox
        ref="name"
        v-model="name"
        :autofocus="true"
        :label="$tr('name')"
        :disabled="!canEditName || busy"
        :maxlength="120"
        :invalid="Boolean(nameIsInvalidText)"
        :invalidText="nameIsInvalidText"
        @blur="nameBlurred = true"
      />
      <KTextbox
        ref="username"
        v-model="username"
        :label="$tr('username')"
        :disabled="!canEditUsername || busy"
        :maxlength="30"
        :invalid="Boolean(usernameIsInvalidText)"
        :invalidText="usernameIsInvalidText"
        @blur="usernameBlurred = true"
        @input="handleInputUsername"
      />

      <SelectGender
        class="select"
        :value.sync="gender"
        :disabled="busy"
      />
      <SelectBirthYear
        class="select"
        :value.sync="birthYear"
        :showTooltip="false"
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
  import { validateUsername } from 'kolibri.utils.validators';
  import KButton from 'kolibri.coreVue.components.KButton';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import SelectGender from './SignUpPage/SelectGender';
  import SelectBirthYear from './SignUpPage/SelectBirthYear';

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
      KTextbox,
      SelectGender,
      SelectBirthYear,
    },
    props: {},
    data() {
      const { username, full_name } = this.$store.state.core.session;
      return {
        name: full_name,
        nameBlurred: false,
        username,
        usernameBlurred: false,
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
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.name === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      usernameAlreadyExists() {
        return this.caughtErrors.includes(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS);
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
          }
          if (!validateUsername(this.username)) {
            return this.$tr('usernameAlphaNumError');
          }
          if (this.usernameAlreadyExists) {
            return this.$tr('usernameAlreadyExistsError');
          }
        }
        return '';
      },
      formIsValid() {
        return !some([this.nameIsInvalidText, this.usernameIsInvalidText], Boolean);
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
                full_name: this.name,
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
          if (this.nameIsInvalidText) {
            this.$refs.name.focus();
          } else if (this.usernameIsInvalidText) {
            this.$refs.username.focus();
          }
        });
      },
      handleInputUsername() {
        if (this.caughtErrors.length > 0) {
          this.caughtErrors = [];
        }
      },
    },
    $trs: {
      cancelAction: 'Cancel',
      editProfileHeader: 'Edit profile',
      name: 'Full name',
      required: 'This field is required',
      saveAction: 'Save',
      updateSuccessNotification: 'Profile details updated',
      username: 'Username',
      usernameAlreadyExistsError: 'An account with that username already exists',
      usernameAlphaNumError: 'Username can only contain letters, numbers, and underscores',
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
