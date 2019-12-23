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
              {{ currentFacility.label }}
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
            class="submit"
          />
        </p>

      </form>
    </KPageContainer>

    <div v-if="atFirstStep" class="footer">
      <LanguageSwitcherFooter />
    </div>

    <FacilityModal
      v-if="facilityModalVisible"
      @cancel="closeFacilityModal"
      @submit="closeFacilityModal"
    />
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import every from 'lodash/every';
  import find from 'lodash/find';
  import { FacilityUsernameResource } from 'kolibri.resources';
  import { DemographicConstants, ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import GenderSelect from 'kolibri.coreVue.components.GenderSelect';
  import BirthYearSelect from 'kolibri.coreVue.components.BirthYearSelect';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import PrivacyLinkAndModal from 'kolibri.coreVue.components.PrivacyLinkAndModal';
  import { redirectBrowser } from 'kolibri.utils.browser';
  import CatchErrors from 'kolibri.utils.CatchErrors';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { SignUpResource } from '../apiResource';
  import LanguageSwitcherFooter from './LanguageSwitcherFooter';
  import FacilityModal from './SignInPage/FacilityModal';
  import getUrlParameter from './getUrlParameter';
  import plugin_data from 'plugin_data';

  const { DEFERRED } = DemographicConstants;

  export default {
    name: 'SignUpPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      FacilityModal,
      LanguageSwitcherFooter,
      GenderSelect,
      BirthYearSelect,
      FullNameTextbox,
      PasswordTextbox,
      UsernameTextbox,
      PrivacyLinkAndModal,
    },
    mixins: [commonCoreStrings],
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
        facilityModalVisible: false,
        currentFacility: null,
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
      // If no user input is in memory, reset the wizard
      if (!this.username) {
        this.goToFirstStep();
      }
      if (!this.$store.state.facilityId) {
        if (this.facilityList.length === 1) {
          this.currentFacility = this.facilityList[0];
        } else {
          this.facilityModalVisible = true;
        }
      } else {
        this.currentFacility = this.facilityList.find(
          ({ value }) => value === this.$store.state.facilityId
        );
      }
    },
    methods: {
      closeFacilityModal() {
        this.facilityModalVisible = false;
        this.currentFacility = this.facilityList.find(
          ({ value }) => value === this.$store.state.facilityId
        );
        this.$nextTick().then(() => {
          this.$refs.fullNameTextbox.focus();
        });
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
            facility: this.currentFacility.value,
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
          this.formSubmitted = true;
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
          const payload = {
            facility: this.currentFacility.value,
            full_name: this.name,
            username: this.username,
            password: this.password,
            // If user skips this part, these fields are marked as 'DEFERRED'
            // so they don't see a notification after logging in.
            gender: this.gender || DEFERRED,
            birth_year: this.birthYear || DEFERRED,
          };
          if (plugin_data.oidcProviderEnabled) {
            payload['next'] = this.nextParam;
          }
          SignUpResource.saveModel({ data: payload })
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
      documentTitle: 'Create account',
      demographicInfoOptional: {
        message: 'Providing this information is optional.',
        context: '\nClarifying information that providing the demographic information is optional.',
      },
      demographicInfoExplanation: {
        message:
          'It will be visible to administrators. It will also be used to help improve the software and resources for different learner types and needs.',
        context: '\nDetails on how the demographic information requested in the form will be used.',
      },
      privacyLinkText: {
        message: 'Learn more about usage and privacy',
        context:
          '\nLink to open the Kolibri usage and privacy modal. It will be displayed alongside the text describing collection of demographic user information.',
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

  .submit {
    margin-left: 0;
  }

  .select {
    margin: 18px 0 36px;
  }

</style>
