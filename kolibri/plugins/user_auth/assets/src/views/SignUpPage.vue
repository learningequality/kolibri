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
            v-if="showPasswordInput"
            ref="passwordTextbox"
            autocomplete="new-password"
            :value.sync="password"
            :isValid.sync="passwordValid"
            :shouldValidate="formSubmitted"
            :disabled="busy"
          />

          <template v-if="selectedFacility.name">
            <h2>
              {{ coreString('facilityLabel') }}
            </h2>
            <p data-test="facilityLabel">
              {{ selectedFacility.name }}
            </p>
          </template>

          <PrivacyLinkAndModal
            class="privacy-link"
            :modalProps="{ hideOwnersSection: true }"
          />
        </div>

        <div v-show="!atFirstStep">
          <p>
            {{ $tr('demographicInfoOptional') }}
          </p>
          <p>
            {{ $tr('demographicInfoExplanation') }}
          </p>
          <p>
            <PrivacyLinkAndModal
              class="privacy-link"
              :text="$tr('privacyLinkText')"
              :modalProps="{ hideOwnersSection: true }"
            />
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

        <p>
          <KButton
            :disabled="busy"
            :primary="true"
            :text="atFirstStep ? coreString('continueAction') : coreString('finishAction')"
            type="submit"
          />
        </p>
        <KRouterLink
          :text="userString('signInPrompt')"
          :to="$router.getRoute(ComponentMap.SIGN_IN)"
          appearance="basic-link"
        />
      </form>
    </KPageContainer>

    <div
      v-if="atFirstStep"
      class="footer"
    >
      <LanguageSwitcherFooter />
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import every from 'lodash/every';
  import { DemographicConstants, ERROR_CONSTANTS } from 'kolibri/constants';
  import GenderSelect from 'kolibri-common/components/userAccounts/GenderSelect';
  import BirthYearSelect from 'kolibri-common/components/userAccounts/BirthYearSelect';
  import FullNameTextbox from 'kolibri-common/components/userAccounts/FullNameTextbox';
  import UsernameTextbox from 'kolibri-common/components/userAccounts/UsernameTextbox';
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import PrivacyLinkAndModal from 'kolibri-common/components/userAccounts/PrivacyLinkAndModal';
  import redirectBrowser from 'kolibri/utils/redirectBrowser';
  import urls from 'kolibri/urls';
  import client from 'kolibri/client';
  import CatchErrors from 'kolibri/utils/CatchErrors';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { ComponentMap } from '../constants';
  import { SignUpResource } from '../apiResource';
  import LanguageSwitcherFooter from './LanguageSwitcherFooter';
  import getUrlParameter from './getUrlParameter';
  import commonUserStrings from './commonUserStrings';

  const { DEFERRED } = DemographicConstants;

  export default {
    name: 'SignUpPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      LanguageSwitcherFooter,
      GenderSelect,
      BirthYearSelect,
      FullNameTextbox,
      PasswordTextbox,
      UsernameTextbox,
      PrivacyLinkAndModal,
    },
    mixins: [commonCoreStrings, commonUserStrings],
    data() {
      return {
        name: '',
        nameValid: true,
        username: '',
        usernameValid: true,
        password: '',
        passwordValid: true,
        formSubmitted: false,
        gender: '',
        birthYear: '',
        caughtErrors: [],
        busy: false,
      };
    },
    computed: {
      ...mapGetters(['selectedFacility', 'facilityConfig']),
      atFirstStep() {
        return !this.$route.query.step || this.$route.query.step === 1;
      },
      firstStepIsValid() {
        return every([this.nameValid, this.usernameValid, this.passwordValid]);
      },
      ComponentMap() {
        return ComponentMap;
      },
      nextParam() {
        // query is after hash
        if (this.$route.query.next) {
          return this.$route.query.next;
        }
        // query is before hash
        return getUrlParameter('next');
      },
      showPasswordInput() {
        return !this.facilityConfig.learner_can_login_with_no_password;
      },
    },
    beforeMount() {
      // If no user input is in memory, reset the wizard
      if (!this.atFirstStep && !this.username) {
        this.goToFirstStep();
      }
    },
    methods: {
      checkForDuplicateUsername(username) {
        if (!username) {
          return Promise.resolve();
        }
        return client({
          url: urls['kolibri:core:usernameavailable'](),
          method: 'POST',
          data: {
            facility: this.selectedFacility.id,
            username,
          },
        }).catch(error => {
          const errorsCaught = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
          if (errorsCaught) {
            this.caughtErrors.push(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS);
          } else {
            this.$store.dispatch('handleApiError', { error });
          }
        });
      },
      handleSubmit() {
        if (this.atFirstStep) {
          this.formSubmitted = true;
          this.goToSecondStep();
        } else {
          this.submitNewFacilityUser();
        }
      },
      goToFirstStep() {
        this.$router.replace({
          query: {
            ...this.$route.query,
            step: 1,
          },
        });
      },
      goToSecondStep() {
        if (this.firstStepIsValid) {
          this.checkForDuplicateUsername(this.username).then(() => {
            if (this.firstStepIsValid) {
              this.$router.push({
                query: {
                  ...this.$route.query,
                  step: 2,
                },
              });
            } else {
              this.focusOnInvalidField();
            }
          });
        } else {
          this.focusOnInvalidField();
        }
      },
      passwordToSave() {
        if (this.facilityConfig.learner_can_login_with_no_password && this.password === '')
          return 'NOT_SPECIFIED';

        return this.password;
      },

      submitNewFacilityUser() {
        this.formSubmitted = true;
        const canSubmit = this.firstStepIsValid && !this.busy;
        if (canSubmit) {
          this.busy = true;
          const payload = {
            facility: this.selectedFacility.id,
            full_name: this.name,
            username: this.username,
            password: this.passwordToSave(),
            // If user skips this part, these fields are marked as 'DEFERRED'
            // so they don't see a notification after logging in.
            gender: this.gender || DEFERRED,
            birth_year: this.birthYear || DEFERRED,
          };
          SignUpResource.saveModel({ data: payload })
            .then(() => {
              if (this.nextParam) {
                redirectBrowser(this.nextParam);
              } else {
                redirectBrowser();
              }
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
                this.$store.dispatch('handleApiError', { error });
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
      createAccount: {
        message: 'Create an account',
        context: 'Title on sign in page where user creates an account.',
      },
      documentTitle: {
        message: 'Create account',
        context:
          "Title of the 'Create account' page accessed by selecting the 'CREATE  AN ACCOUNT' button.",
      },
      demographicInfoOptional: {
        message: 'Providing this information is optional.',
        context: 'Clarifying information that providing the demographic information is optional.',
      },
      demographicInfoExplanation: {
        message:
          'It will be visible to administrators. It will also be used to help improve the software and resources for different learner types and needs.',

        context: 'Details on how the demographic information requested in the form will be used.',
      },
      privacyLinkText: {
        message: 'Learn more about usage and privacy',
        context:
          'Link to open the Kolibri usage and privacy modal. It will be displayed alongside the text describing collection of demographic user information.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .narrow-container {
    max-width: 600px;
    margin: auto;
    overflow: visible;
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

  .select {
    margin: 18px 0 36px;
  }

  .guest {
    display: block;
    margin: 0 auto;
  }

</style>
