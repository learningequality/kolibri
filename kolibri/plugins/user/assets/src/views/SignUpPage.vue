<template>

  <div class="signup-page">

    <form
      ref="form"
      class="signup-form"
      @submit.prevent="signUp"
    >
      <h1>{{ $tr('createAccountAction') }}</h1>

      <KTextbox
        id="name"
        ref="name"
        v-model="name"
        type="text"
        autocomplete="name"
        :label="coreString('fullNameLabel')"
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
        :label="coreString('usernameLabel')"
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
        :label="coreString('passwordLabel')"
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

      <KSelect
        v-model="selectedFacility"
        :label="coreString('facilityLabel')"
        :options="facilityList"
        :invalid="facilityIsInvalid"
        :invalidText="facilityIsInvalidText"
        :disabled="facilityList.length === 1"
        @blur="facilityBlurred = true"
      />

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
          :text="coreString('finishAction')"
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
    />

  </div>

</template>


<script>

  import { mapState, mapActions, mapGetters, mapMutations } from 'vuex';
  import { validateUsername } from 'kolibri.utils.validators';
  import KButton from 'kolibri.shared.KButton';
  import KTextbox from 'kolibri.shared.KTextbox';
  import KSelect from 'kolibri.shared.KSelect';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
      KButton,
      KTextbox,
      KSelect,
      LanguageSwitcherFooter,
      PrivacyInfoModal,
    },
    mixins: [commonCoreStrings],
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
    }),
    computed: {
      ...mapGetters(['facilities']),
      ...mapState('signUp', ['errors', 'busy']),
      facilityList() {
        return this.facilities.map(facility => ({
          label: facility.name,
          value: facility.id,
        }));
      },
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.name === '') {
            return this.coreString('requiredFieldLabel');
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
            return this.coreString('requiredFieldLabel');
          }
          if (!validateUsername(this.username) || this.errors.includes(ERROR_CONSTANTS.INVALID)) {
            return this.coreString('usernameNotAlphaNumError');
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
            return this.coreString('requiredFieldLabel');
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
            return this.coreString('requiredFieldLabel');
          }
          if (this.confirmedPassword !== this.password) {
            return this.coreString('passwordsMismatchError');
          }
        }
        return '';
      },
      confirmedPasswordIsInvalid() {
        return Boolean(this.confirmedPasswordIsInvalidText);
      },
      noFacilitySelected() {
        return !this.selectedFacility.value;
      },
      facilityIsInvalidText() {
        if (this.facilityBlurred || this.formSubmitted) {
          if (this.noFacilitySelected) {
            return this.coreString('requiredFieldLabel');
          }
        }
        return '';
      },
      facilityIsInvalid() {
        return Boolean(this.facilityIsInvalidText);
      },
      formIsValid() {
        return (
          !this.nameIsInvalid &&
          !this.usernameIsInvalid &&
          !this.passwordIsInvalid &&
          !this.confirmedPasswordIsInvalid &&
          !this.facilityIsInvalid
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
      if (this.facilityList.length === 1) {
        this.selectedFacility = this.facilityList[0];
      }
    },
    methods: {
      ...mapActions('signUp', ['signUpNewUser']),
      ...mapMutations('signUp', {
        resetSignUpState: 'RESET_STATE',
      }),
      signUp() {
        this.formSubmitted = true;
        const canSubmit = this.formIsValid && !this.busy;
        if (canSubmit) {
          const payload = {
            facility: this.selectedFacility.value,
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
      createAccountAction: 'Create an account',
      reEnterPassword: 'Re-enter password',
      usernameAlreadyExistsError: 'An account with that username already exists',
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
