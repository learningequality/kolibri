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
          <FullNameTextbox
            ref="fullNameTextbox"
            autocomplete="name"
            :value.sync="name"
            :isValid.sync="nameValid"
            :autofocus="true"
            :shouldValidate="formSubmitted"
            :disabled="busy"
          />

          <UsernameTextbox
            ref="usernameTextbox"
            autocomplete="username"
            :value.sync="username"
            :isValid.sync="usernameValid"
            :shouldValidate="formSubmitted"
            :errors.sync="caughtErrors"
            :disabled="busy"
          />

          <PasswordTextbox
            ref="passwordTextbox"
            autocomplete="new-password"
            :value.sync="password"
            :isValid.sync="passwordValid"
            :shouldValidate="formSubmitted"
            :disabled="busy"
          />

          <template v-if="currentFacility">
            <h2>
              {{ coreString('facilityLabel') }}
            </h2>
            <p>
              {{ currentFacility.name }}
            </p>
          </template>
        </div>

        <div v-show="!atFirstStep">
          <p>
            {{ $tr('demographicInfoExplanation') }}
          </p>
          <GenderSelect
            class="select"
            :value.sync="gender"
            :disabled="busy"
          />
          <BirthYearSelect
            class="select"
            :value.sync="birthYear"
            :disabled="busy"
          />
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

  import { mapGetters } from 'vuex';
  import every from 'lodash/every';
  import find from 'lodash/find';
  import { FacilityUsernameResource, SignUpResource } from 'kolibri.resources';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import PrivacyInfoModal from 'kolibri.coreVue.components.PrivacyInfoModal';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import GenderSelect from 'kolibri.coreVue.components.GenderSelect';
  import BirthYearSelect from 'kolibri.coreVue.components.BirthYearSelect';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import { redirectBrowser } from 'kolibri.utils.browser';
  import CatchErrors from 'kolibri.utils.CatchErrors';
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
      KPageContainer,
      LanguageSwitcherFooter,
      PrivacyInfoModal,
      GenderSelect,
      BirthYearSelect,
      FullNameTextbox,
      PasswordTextbox,
      UsernameTextbox,
    },
    data() {
      return {
        name: '',
        nameValid: true,
        username: '',
        usernameValid: true,
        password: '',
        passwordValid: true,
        formSubmitted: false,
        privacyModalVisible: false,
        gender: '',
        birthYear: '',
        caughtErrors: [],
        busy: false,
      };
    },
    computed: {
      ...mapGetters(['facilities']),
      atFirstStep() {
        return !this.$route.query.step;
      },
      facilityList() {
        return this.facilities.map(({ name, id }) => ({
          label: name,
          value: id,
        }));
      },
      firstStepIsValid() {
        return every([this.nameValid, this.usernameValid, this.passwordValid]);
      },
    },
    beforeMount() {
      // If no user input is in memory, reset the wizard
      if (!this.username) {
        this.goToFirstStep();
      }
      if (this.facilityList.length === 1) {
        this.selectedFacility = this.facilityList[0];
      }
    },
    methods: {
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
              this.caughtErrors.push(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS);
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
      goToFirstStep() {
        this.$router.replace({ query: {} });
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
          this.busy = true;
          SignUpResource.saveModel({
            data: {
              facility: this.selectedFacility.value,
              full_name: this.name,
              username: this.username,
              password: this.password,
              // If user skips this part, these fields are marked as 'DEFER'
              // so they don't see a notification after logging in.
              gender: this.gender || 'DEFER',
              birth_year: this.birthYear || 'DEFER',
            },
          })
            .then(() => {
              redirectBrowser();
            })
            .catch(error => {
              this.busy = false;
              this.caughtErrors = CatchErrors(error, [
                ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS,
                ERROR_CONSTANTS.INVALID,
              ]);
              if (this.caughtErrors.length > 0) {
                this.goToFirstStep();
                this.focusOnInvalidField();
              } else {
                this.$store.dispatch('handleApiError', error);
              }
            });
        } else {
          this.busy = false;
          this.goToFirstStep();
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.nameValid) {
            this.$refs.fullNameTextbox.focus();
          } else if (!this.usernameValid) {
            this.$refs.usernameTextbox.focus();
          } else if (!this.passwordValid) {
            this.$refs.passwordTextbox.focus();
          }
        });
      },
    },
    $trs: {
      createAccount: 'Create an account',
      logIn: 'Sign in',
      kolibri: 'Kolibri',
      continue: 'Continue',
      finish: 'Finish',
      facility: 'Facility',
      required: 'This field is required',
      documentTitle: 'Create account',
      privacyLink: 'Usage and privacy in Kolibri',
      demographicInfoExplanation:
        'This information is optional. It is used to help with user administration.',
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
    min-height: 500px;
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
