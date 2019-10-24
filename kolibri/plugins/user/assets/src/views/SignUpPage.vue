<template>

  <div class="signup-page">

    <form
      ref="form"
      class="signup-form"
      @submit.prevent="signUp"
    >
      <h1>{{ $tr('createAccount') }}</h1>

      <KTextbox
        id="name"
        ref="name"
        v-model="name"
        type="text"
        autocomplete="name"
        :label="$tr('name')"
        :maxlength="120"
        :autofocus="true"
        :invalid="nameIsInvalid"
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
        :invalid="usernameIsInvalid"
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
        :invalid="passwordIsInvalid"
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
        :invalid="confirmedPasswordIsInvalid"
        :invalidText="confirmedPasswordIsInvalidText"
        @blur="confirmedPasswordBlurred = true"
      />

      <template v-if="currentFacility">
        <h2>
          {{ $tr('facility') }}
        </h2>
        <p>
          {{ currentFacility.name }}
        </p>
      </template>

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
          :text="$tr('finish')"
          type="submit"
          class="submit"
        />
      </p>

    </form>

    <div class="footer">
      <LanguageSwitcherFooter />
    </div>

    <PrivacyInfoModal
      v-if="privacyModalVisible"
      hideOwnersSection
      @cancel="privacyModalVisible = false"
      @submit="privacyModalVisible = false"
    />

    <FacilityModal
      v-if="facilityModalVisible"
      @cancel="closeFacilityModal"
      @submit="closeFacilityModal"
    />

  </div>

</template>


<script>

  import { mapState, mapActions, mapGetters, mapMutations } from 'vuex';
  import { validateUsername } from 'kolibri.utils.validators';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import FacilityModal from './SignInPage/FacilityModal';
  import getUrlParameter from './getUrlParameter';
  import LanguageSwitcherFooter from './LanguageSwitcherFooter';

  export default {
    name: 'SignUpPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      FacilityModal,
      KButton,
      KTextbox,
      LanguageSwitcherFooter,
      PrivacyInfoModal,
    },
    data: () => ({
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
      facilityModalVisible: false,
    }),
    computed: {
      ...mapGetters(['facilities']),
      ...mapState('signUp', ['errors', 'busy']),
      currentFacility() {
        return this.facilities.find(facility => facility.id === this.$store.state.facilityId);
      },
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.name === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return Boolean(this.nameIsInvalidText);
      },
      usernameDoesNotExistYet() {
        if (this.errors.includes(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS)) {
          return false;
        }
        return true;
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
          }
          if (!validateUsername(this.username) || this.errors.includes(ERROR_CONSTANTS.INVALID)) {
            return this.$tr('usernameAlphaNumError');
          }
          if (!this.usernameDoesNotExistYet) {
            return this.$tr('usernameAlreadyExistsError');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return Boolean(this.usernameIsInvalidText);
      },
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.formSubmitted) {
          if (this.password === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      passwordIsInvalid() {
        return Boolean(this.passwordIsInvalidText);
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
      confirmedPasswordIsInvalid() {
        return Boolean(this.confirmedPasswordIsInvalidText);
      },
      formIsValid() {
        return (
          !this.nameIsInvalid &&
          !this.usernameIsInvalid &&
          !this.passwordIsInvalid &&
          !this.confirmedPasswordIsInvalid
        );
      },
      nextParam() {
        // query is after hash
        if (this.$route.query.next) {
          return this.$route.query.next;
        }
        // query is before hash
        return getUrlParameter('next');
      },
    },
    beforeMount() {
      if (!this.currentFacility) {
        this.facilityModalVisible = true;
      }
    },
    methods: {
      ...mapActions('signUp', ['signUpNewUser']),
      ...mapMutations('signUp', {
        resetSignUpState: 'RESET_STATE',
      }),
      closeFacilityModal() {
        this.facilityModalVisible = false;
        this.$nextTick().then(() => {
          this.$refs.name.focus();
        });
      },
      signUp() {
        this.formSubmitted = true;
        const canSubmit = this.formIsValid && !this.busy;
        if (canSubmit) {
          const payload = {
            facility: this.currentFacility.id,
            full_name: this.name,
            username: this.username,
            password: this.password,
          };
          if (global.oidcProviderEnabled) {
            payload['next'] = this.nextParam;
          }
          this.signUpNewUser(payload);
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        if (this.nameIsInvalid) {
          this.$refs.name.focus();
        } else if (this.usernameIsInvalid) {
          this.$refs.username.focus();
        } else if (this.passwordIsInvalid) {
          this.$refs.password.focus();
        } else if (this.confirmedPasswordIsInvalid) {
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
      usernameAlphaNumError: 'Username can only contain letters, numbers, and underscores',
      usernameAlreadyExistsError: 'An account with that username already exists',
      finish: 'Finish',
      facility: 'Facility',
      required: 'This field is required',
      documentTitle: 'User Sign Up',
      privacyLink: 'Usage and privacy in Kolibri',
    },
  };

</script>


<style lang="scss" scoped>

  $iphone-5-width: 320px;
  $vertical-page-margin: 100px;

  // Form
  .signup-form {
    max-width: $iphone-5-width - 20;
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

</style>
