<template>

  <div class="signup-page">

    <KPageContainer class="narrow-container">
      <form
        ref="form"
        class="signup-form"
        @submit.prevent="handleSubmit"
      >
        <h1>{{ $tr('createAccount') }}</h1>

        <div v-show="atFirstStep">
          <KTextbox
            id="name"
            ref="name"
            v-model="name"
            type="text"
            autocomplete="name"
            :label="$tr('name')"
            :maxlength="120"
            :autofocus="true"
            :invalid="Boolean(nameIsInvalidText)"
            :invalidText="nameIsInvalidText"
            @blur="nameBlurred = true"
          />

          <KTextbox
            id="username"
            ref="username"
            v-model="username"
            type="text"
            autocomplete="username"
            :label="$tr('username')"
            :maxlength="30"
            :invalid="Boolean(usernameIsInvalidText)"
            :invalidText="usernameIsInvalidText"
            @blur="usernameBlurred = true"
            @input="resetSignUpState"
          />

          <KTextbox
            id="password"
            ref="password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            :label="$tr('password')"
            :invalid="Boolean(passwordIsInvalidText)"
            :invalidText="passwordIsInvalidText"
            @blur="passwordBlurred = true"
          />

          <KTextbox
            id="confirmed-password"
            ref="confirmedPassword"
            v-model="confirmedPassword"
            type="password"
            autocomplete="new-password"
            :label="$tr('reEnterPassword')"
            :invalid="Boolean(confirmedPasswordIsInvalidText)"
            :invalidText="confirmedPasswordIsInvalidText"
            @blur="confirmedPasswordBlurred = true"
          />

          <KSelect
            v-model="selectedFacility"
            :label="$tr('facility')"
            :options="facilityList"
            :invalid="Boolean(facilityIsInvalidText)"
            :invalidText="facilityIsInvalidText"
            :disabled="facilityList.length === 1"
            @blur="facilityBlurred = true"
          />
        </div>

        <div v-show="!atFirstStep">
          <p>
            {{ $tr('demographicInfoExplanation') }}
          </p>
          <GenderSelect class="select" :value.sync="gender" />
          <BirthYearSelect class="select" :value.sync="birthYear" />
        </div>

        <p class="privacy-link">
          <KButton
            :text="$tr('privacyLink')"
            appearance="basic-link"
            @click="privacyModalVisible = true"
          />
        </p>

        <p>
          <KButton
            :disabled="busy"
            :primary="true"
            :text="atFirstStep ? $tr('continue') : $tr('finish')"
            type="submit"
            class="submit"
          />
        </p>

      </form>
    </KPageContainer>

    <div v-if="atFirstStep" class="footer">
      <LanguageSwitcherFooter />
    </div>

    <PrivacyInfoModal
      v-if="privacyModalVisible"
      hideOwnersSection
      @cancel="privacyModalVisible = false"
    />

  </div>

</template>


<script>

  import { mapState, mapGetters, mapMutations } from 'vuex';
  import some from 'lodash/some';
  import find from 'lodash/find';
  import { FacilityUsernameResource } from 'kolibri.resources';
  import { validateUsername } from 'kolibri.utils.validators';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import GenderSelect from 'kolibri.coreVue.components.GenderSelect';
  import BirthYearSelect from 'kolibri.coreVue.components.BirthYearSelect';
  import LanguageSwitcherFooter from '../LanguageSwitcherFooter';

  export default {
    name: 'SignUpPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      KButton,
      KTextbox,
      KSelect,
      KPageContainer,
      LanguageSwitcherFooter,
      PrivacyInfoModal,
      GenderSelect,
      BirthYearSelect,
    },
    data() {
      return {
        name: '',
        username: '',
        password: '',
        confirmedPassword: '',
        selectedFacility: {},
        nameBlurred: false,
        usernameBlurred: false,
        passwordBlurred: false,
        confirmedPasswordBlurred: false,
        facilityBlurred: false,
        formSubmitted: false,
        privacyModalVisible: false,
        gender: null,
        birthYear: null,
      };
    },
    computed: {
      ...mapGetters(['facilities']),
      ...mapState('signUp', ['errors', 'busy']),
      atFirstStep() {
        return !this.$route.query.step;
      },
      facilityList() {
        return this.facilities.map(({ name, id }) => ({
          label: name,
          value: id,
        }));
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
        return this.errors.includes(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS);
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
          }
          if (!validateUsername(this.username) || this.errors.includes(ERROR_CONSTANTS.INVALID)) {
            return this.$tr('usernameAlphaNumError');
          }
          if (this.usernameAlreadyExists) {
            return this.$tr('usernameAlreadyExistsError');
          }
        }
        return '';
      },
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.formSubmitted) {
          if (this.password === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      confirmedPasswordIsInvalidText() {
        if (this.confirmedPasswordBlurred || this.formSubmitted) {
          if (this.confirmedPassword === '') {
            return this.$tr('required');
          }
          if (this.confirmedPassword !== this.password) {
            return this.$tr('passwordMatchError');
          }
        }
        return '';
      },
      facilityIsInvalidText() {
        if (this.facilityBlurred || this.formSubmitted) {
          if (!this.selectedFacility.value) {
            return this.$tr('required');
          }
        }
        return '';
      },
      firstStepIsValid() {
        return !some(
          [
            this.nameIsInvalidText,
            this.usernameIsInvalidText,
            this.passwordIsInvalidText,
            this.confirmedPasswordIsInvalidText,
            this.facilityIsInvalidText,
          ],
          Boolean
        );
      },
    },
    beforeMount() {
      // If no user input is in memory, reset the wizard
      if (!this.username) {
        this.$router.replace({ query: {} });
      }
      if (this.facilityList.length === 1) {
        this.selectedFacility = this.facilityList[0];
      }
    },
    methods: {
      ...mapMutations('signUp', {
        resetSignUpState: 'RESET_STATE',
      }),
      goToFirstStep() {
        this.$router.replace({ query: {} });
      },
      checkForDuplicateUsername(username) {
        if (!username) {
          return Promise.resolve();
        }
        // NOTE: the superuser will not be returned in this search.
        // TODO: create an specialized endpoint that only checks to see if a username
        // already exists in a facility
        return FacilityUsernameResource.fetchCollection({
          getParams: {
            facility: this.selectedFacility.value,
            search: username,
          },
          force: true,
        })
          .then(results => {
            if (find(results, { username })) {
              this.$store.commit('signUp/SET_SIGN_UP_ERRORS', [
                ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS,
              ]);
            }
          })
          .catch(() => {
            // Silently handle search errors, idk
          });
      },
      handleSubmit() {
        if (this.atFirstStep) {
          this.goToSecondStep();
        } else {
          this.submitNewFacilityUser();
        }
      },
      goToSecondStep() {
        if (this.firstStepIsValid) {
          this.checkForDuplicateUsername(this.username).then(() => {
            if (this.firstStepIsValid) {
              this.$router.push({ query: { step: 2 } });
            } else {
              this.focusOnInvalidField();
            }
          });
        } else {
          this.focusOnInvalidField();
        }
      },
      submitNewFacilityUser() {
        this.formSubmitted = true;
        const canSubmit = this.firstStepIsValid && !this.busy;
        if (canSubmit) {
          this.$store
            .dispatch('signUp/signUpNewUser', {
              facility: this.selectedFacility.value,
              full_name: this.name,
              username: this.username,
              password: this.password,
              // gender: this.gender,
              // birth_year: this.birthYear,
            })
            .then(() => {
              // Catch the superusername edge case
              if (this.usernameAlreadyExists) {
                this.goToFirstStep();
                this.$nextTick().then(() => this.focusOnInvalidField());
              }
            });
        } else {
          this.goToFirstStep();
          this.$nextTick().then(() => this.focusOnInvalidField());
        }
      },
      focusOnInvalidField() {
        if (this.nameIsInvalidText) {
          this.$refs.name.focus();
        } else if (this.usernameIsInvalidText) {
          this.$refs.username.focus();
        } else if (this.passwordIsInvalidText) {
          this.$refs.password.focus();
        } else if (this.confirmedPasswordIsInvalidText) {
          this.$refs.confirmedPassword.focus();
        }
      },
    },
    $trs: {
      createAccount: 'Create an account',
      name: 'Full name',
      username: 'Username',
      password: 'Password',
      reEnterPassword: 'Re-enter password',
      passwordMatchError: 'Passwords do not match',
      genericError: 'Something went wrong during account creation',
      usernameAlphaNumError: 'Username can only contain letters, numbers, and underscores',
      usernameAlreadyExistsError: 'An account with that username already exists',
      logIn: 'Sign in',
      kolibri: 'Kolibri',
      continue: 'Continue',
      finish: 'Finish',
      facility: 'Facility',
      required: 'This field is required',
      documentTitle: 'Create account',
      privacyLink: 'Usage and privacy in Kolibri',
      demographicInfoExplanation:
        'This information is helpful to administrators on Kolibri and is optional to provide',
    },
  };

</script>


<style lang="scss" scoped>

  $iphone-5-width: 320px;
  $vertical-page-margin: 100px;

  .narrow-container {
    width: 600px;
    margin: auto;
  }

  // Form
  .signup-form {
    max-width: 400px;
    margin-right: auto;
    margin-left: auto;
  }

  .footer {
    margin: 36px;
    margin-top: 48px;
  }

  .privacy-link {
    margin-top: 24px;
  }

  .submit {
    margin-left: 0;
  }

  .select {
    margin: 18px 0 36px;
  }

</style>
