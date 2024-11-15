<template>

  <AuthBase :busy="busy">
    <!--
        Unless we know the user needs to create a password enter this div
        block for the main flow - see the v-else below for the create password flow
      -->
    <div v-if="!needsToCreatePassword">
      <!-- ** Text and Backlinks ** -->

      <div style="display: block; width: 100%; text-align: left">
        <!-- In MFD show return to facility select when not asking for password -->
        <KRouterLink
          v-if="hasMultipleFacilities && !showPasswordForm"
          icon="back"
          :text="coreString('changeLearningFacility')"
          :to="backToFacilitySelectionRoute"
          style="margin-top: 24px; margin-left: -4px"
        />

        <!-- When password form shows, show a change user link -->
        <!-- Not using v-else here to be more explicit -->
        <KButton
          v-if="showPasswordForm"
          appearance="basic-link"
          :text="$tr('changeUser')"
          style="margin-top: 24px; margin-left: 4px"
          @click="clearUser"
        >
          <template #icon>
            <KIcon
              style="top: 6px; right: 8px; width: 24px; height: 24px"
              icon="back"
              :color="$themeTokens.primary"
            />
          </template>
        </KButton>
      </div>

      <SignInHeading
        :showFacilityName="showFacilityName"
        :showPasswordForm="showPasswordForm"
        :username="username"
      />

      <!-- END Text & Backlinks -->

      <!--
          USERNAME FORM
          Presented to user **unless** we are in app context AND have <= 16 users in the facility
          TODO: Extract this into a separate component. We're post string freeze and short on
          time right now
        -->
      <form
        ref="form"
        class="login-form"
        @submit.prevent="signIn"
      >
        <div v-show="showUsernameForm">
          <transition name="textbox">
            <KTextbox
              id="username"
              ref="username"
              v-model.trim="username"
              autocomplete="username"
              :autofocus="true"
              :label="coreString('usernameLabel')"
              :invalid="usernameIsInvalid"
              :invalidText="usernameIsInvalidText"
              @blur="handleUsernameBlur"
              @input="handleUsernameInput"
              @keydown="handleUsernameKeydown"
            />
          </transition>
          <transition name="list">
            <div class="suggestions-wrapper">
              <ul
                v-if="simpleSignIn && suggestions.length"
                v-show="showDropdown"
                class="suggestions"
                :style="{ backgroundColor: $themeTokens.surface }"
              >
                <UiAutocompleteSuggestion
                  v-for="(suggestion, i) in suggestions"
                  :key="i"
                  :suggestion="suggestion"
                  :style="suggestionStyle(i)"
                  @mousedown.native="fillUsername(suggestion)"
                />
              </ul>
            </div>
          </transition>
          <div>
            <KButton
              class="login-btn"
              :text="$tr('nextLabel')"
              :primary="true"
              :disabled="!isNextButtonEnabled"
              @click="signIn"
            />
          </div>
        </div>
        <div v-if="showPasswordForm">
          <UiAlert
            v-if="invalidCredentials"
            type="error"
            :dismissible="false"
          >
            {{ $tr('incorrectPasswordError') }}
          </UiAlert>
          <transition name="textbox">
            <KTextbox
              id="password"
              ref="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              :label="coreString('passwordLabel')"
              :autofocus="true"
              :invalid="passwordIsInvalid"
              :invalidText="passwordIsInvalidText"
              :floatingLabel="false"
              @blur="handlePasswordBlur"
            />
          </transition>
          <div>
            <KButton
              class="login-btn"
              type="submit"
              :text="coreString('signInLabel')"
              :primary="true"
              :disabled="busy"
            />
          </div>
        </div>
      </form>

      <!--
          USERS LIST
          Shows users in a list of buttons to be selected from.
          Shown in App Context in a Facility with <= 16 users

          TODO: When the username form is moved to its own component,
          integrate this better with that component in next pass for
          state management and event (signIn) handling
        -->
      <UsersList
        v-if="showUsersList && !showPasswordForm"
        :users="usernamesForCurrentFacility"
        :busy="busy"
        @userSelected="setSelectedUsername"
      />
    </div>
  </AuthBase>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import FacilityUsernameResource from 'kolibri-common/apiResources/FacilityUsernameResource';
  import get from 'lodash/get';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { LoginErrors } from 'kolibri/constants';
  import { validateUsername } from 'kolibri/utils/validators';
  import UiAutocompleteSuggestion from 'kolibri-design-system/lib/keen/UiAutocompleteSuggestion';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import useUser from 'kolibri/composables/useUser';
  import { ComponentMap } from '../../constants';
  import getUrlParameter from '../getUrlParameter';
  import AuthBase from '../AuthBase';
  import UsersList from '../UsersList';
  import commonUserStrings from '../commonUserStrings';
  import SignInHeading from './SignInHeading';

  const MAX_USERS_FOR_LISTING_VIEW = 16;

  export default {
    name: 'SignInPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      AuthBase,
      SignInHeading,
      UiAutocompleteSuggestion,
      UiAlert,
      UsersList,
    },
    mixins: [commonCoreStrings, commonUserStrings],
    setup() {
      const { isAppContext } = useUser();
      return { isAppContext };
    },
    data() {
      return {
        username: '',
        password: '',
        usernameSuggestions: [],
        usernamesForCurrentFacility: [],
        suggestionTerm: '',
        showDropdown: true,
        highlightedIndex: -1,
        usernameBlurred: false,
        passwordBlurred: false,
        formSubmitted: false,
        busy: false,
        loginError: null,
        usernameSubmittedWithoutPassword: false,
      };
    },
    computed: {
      ...mapGetters(['selectedFacility']),
      ...mapState('signIn', ['hasMultipleFacilities']),
      backToFacilitySelectionRoute() {
        const facilityRoute = this.$router.getRoute(ComponentMap.FACILITY_SELECT);
        const whereToNext = this.$router.getRoute(ComponentMap.SIGN_IN);
        let query = {};
        if (this.nextParam) {
          query = { next: this.nextParam };
        }
        return { ...facilityRoute, params: { whereToNext }, query };
      },
      showPasswordForm() {
        return (
          Boolean(this.username) &&
          (this.passwordMissing || this.invalidCredentials || this.usernameSubmittedWithoutPassword)
        );
      },
      showUsernameForm() {
        return !this.showPasswordForm && !this.showUsersList;
      },
      passwordMissing() {
        return this.loginError === LoginErrors.PASSWORD_MISSING;
      },
      invalidCredentials() {
        return this.loginError === LoginErrors.INVALID_CREDENTIALS;
      },
      needsToCreatePassword() {
        return this.loginError === LoginErrors.PASSWORD_NOT_SPECIFIED;
      },
      userDoesNotExist() {
        return this.loginError === LoginErrors.USER_NOT_FOUND;
      },
      simpleSignIn() {
        return this.selectedFacility.dataset.learner_can_login_with_no_password;
      },
      showUsersList() {
        return this.selectedFacility.num_users <= MAX_USERS_FOR_LISTING_VIEW && this.isAppContext;
      },
      suggestions() {
        // Filter suggestions on the client side so we don't hammer the server
        return this.usernameSuggestions.filter(sug =>
          sug.toLowerCase().startsWith(this.username.toLowerCase()),
        );
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.coreString('requiredFieldError');
          } else if (!validateUsername(this.username)) {
            return this.coreString('usernameNotAlphaNumError');
          } else if (this.userDoesNotExist) {
            return this.$tr('usernameNotFoundError');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return Boolean(this.usernameIsInvalidText);
      },
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.formSubmitted) {
          if (this.simpleSignIn && this.password === '') {
            return this.$tr('requiredForCoachesAdmins');
          } else if (this.password === '') {
            return this.coreString('requiredFieldError');
          }
        }
        return '';
      },
      passwordIsInvalid() {
        return Boolean(this.passwordIsInvalidText);
      },
      nextParam() {
        // query is after hash
        if (this.$route.query.next) {
          return this.$route.query.next;
        }
        // query is before hash
        return getUrlParameter('next');
      },
      showFacilityName() {
        return (
          this.hasMultipleFacilities || get(this.selectedFacility, 'dataset.preset') !== 'informal'
        );
      },
      isNextButtonEnabled() {
        return !this.busy && this.username !== '' && validateUsername(this.username);
      },
    },
    watch: {
      username(newVal) {
        if (this.simpleSignIn && !this.showUsersList) {
          this.setSuggestionTerm(newVal);
        }
      },
      // Watch these computed properties and focus the fields
      // that need to be focused for cleaner transitions
      showPasswordForm(b) {
        if (b) {
          this.$nextTick(() => {
            this.$refs.password.focus();
          });
        }
      },
      showUsernameForm(b) {
        if (b) {
          this.$nextTick(() => this.$refs.username.focus());
          this.usernameSubmittedWithoutPassword = false;
        }
      },
    },
    created() {
      // Only fetch if we should fetch for this facility
      if (this.showUsersList) {
        FacilityUsernameResource.fetchCollection({
          getParams: {
            facility: this.selectedFacility.id,
          },
        }).then(data => {
          this.usernamesForCurrentFacility = data.map(u => u.username);
        });
      }
    },
    methods: {
      ...mapActions(['kolibriLogin']),
      clearUser() {
        // Going back to the beginning - undo what we may have
        // changed so far and clearing the errors, if any
        this.username = '';
        this.password = '';
        // This ensures we don't get '<field> required' when going back
        // and forth
        this.usernameBlurred = false;
        this.passwordBlurred = false;
        this.usernameSubmittedWithoutPassword = false;
        this.loginError = null;
      },
      // Sets the selected list user and/or logs them in
      setSelectedUsername(username) {
        this.username = username;
        // Try to sign in now to validate the username
        // and to check if we even need a password
        // or need to change a password
        this.signIn();
      },
      setSuggestionTerm(newVal) {
        if (newVal !== null && typeof newVal !== 'undefined') {
          // Only check if defined or not null
          if (newVal.length < 3) {
            // Don't search for suggestions if less than 3 characters entered
            this.suggestionTerm = '';
            this.usernameSuggestions = [];
          } else if (
            (!newVal.startsWith(this.suggestionTerm) && this.suggestionTerm.length) ||
            !this.suggestionTerm.length
          ) {
            // We have already set a suggestion search term
            // The currently set suggestion term does not match the current username
            // Or we do not currently have a suggestion term set
            // Set it to the new term and fetch new suggestions
            this.suggestionTerm = newVal;
            this.setSuggestions();
          }
        }
      },
      setSuggestions() {
        FacilityUsernameResource.fetchCollection({
          getParams: {
            facility: this.selectedFacility.id,
            search: this.suggestionTerm,
          },
        })
          .then(users => {
            this.usernameSuggestions = users.map(user => user.username);
            this.showDropdown = true;
          })
          .catch(() => {
            this.usernameSuggestions = [];
          });
      },
      handleUsernameKeydown(e) {
        switch (e.code) {
          case 'ArrowDown':
            if (this.showDropdown && this.suggestions.length) {
              this.highlightedIndex = Math.min(
                this.highlightedIndex + 1,
                this.suggestions.length - 1,
              );
            }
            break;
          case 'ArrowUp':
            if (this.showDropdown && this.suggestions.length) {
              this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
            }
            break;
          case 'Escape':
            this.showDropdown = false;
            break;
          case 'NumpadEnter':
          case 'Enter':
            // Prevent form from emitting submit event
            e.preventDefault();
            if (this.highlightedIndex < 0) {
              this.showDropdown = false;
              this.signIn();
            } else {
              this.fillUsername(this.suggestions[this.highlightedIndex]);
            }
            break;
          default:
            this.showDropdown = true;
        }
      },
      fillUsername(username) {
        // Only do this if we have been passed a non-null value
        if (username !== null && typeof username !== 'undefined') {
          this.username = username;
          this.showDropdown = false;
          this.highlightedIndex = -1;
          // focus on input after selection
          this.$refs.username.focus();
        }
      },
      handleUsernameInput() {
        if (this.loginError) {
          this.loginError = '';
        }
        this.showDropdown = true;
        this.usernameBlurred = true;
      },
      handlePasswordBlur() {
        setTimeout(() => (this.passwordBlurred = true), 200);
      },
      handleUsernameBlur() {
        this.usernameBlurred = true;
        // Unblur password to avoid inadvertent validation errors when
        // moving between username and password field views
        this.passwordBlurred = false;
        this.showDropdown = false;
      },
      signIn() {
        if (!this.isNextButtonEnabled) {
          return;
        }
        return this.createSession();
      },
      createSession() {
        this.busy = true;
        const sessionPayload = {
          username: this.username,
          password: this.password,
          facility: this.selectedFacility.id,
        };

        if (this.nextParam) {
          sessionPayload['next'] = this.nextParam;
        }

        this.kolibriLogin(sessionPayload)
          .then(err => {
            // If we don't have a password, we submitted without a username
            if (err) {
              if (err === LoginErrors.PASSWORD_NOT_SPECIFIED) {
                this.$router.push({
                  name: ComponentMap.NEW_PASSWORD,
                  query: sessionPayload,
                });
              } else if (err === LoginErrors.PASSWORD_MISSING) {
                this.usernameSubmittedWithoutPassword = true;
              } else {
                this.loginError = err;
              }
            }

            if (this.invalidCredentials || this.usernameSubmittedWithoutPassword) {
              this.$refs.password.$refs.textbox.$refs.input.select();
            }
            this.busy = false;
          })
          .catch(() => {
            this.busy = false;
          });
      },
      suggestionStyle(i) {
        return {
          backgroundColor: this.highlightedIndex === i ? this.$themePalette.grey.v_300 : '',
        };
      },
    },
    $trs: {
      incorrectPasswordError: {
        message: 'Incorrect password',
        context: 'Error that is shown if the user provides the wrong password.',
      },
      usernameNotFoundError: {
        message: 'Username not found',
        context:
          'Error that is shown when a user provides a username that is not in the facility or loaded onto this device.',
      },
      requiredForCoachesAdmins: {
        message: 'Password is required for coaches and admins',
        context:
          'Indicates that the user needs to enter a password if their user type is either coach or admin.',
      },
      documentTitle: {
        message: 'User Sign In',
        context: 'User sign in page.',
      },
      nextLabel: {
        message: 'Next',
        context: 'Button that user selects to navigate to the next page in the sign in process.',
      },
      changeUser: {
        message: 'Change user',
        context:
          'Link to change the user account which the user uses to sign in if they have more than one account.\n',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .login-form {
    text-align: left;
  }

  .login-btn {
    width: 100%;
    margin-top: 16px;
  }

  .suggestions-wrapper {
    position: relative;
    width: 100%;
  }

  .suggestions {
    @extend %dropshadow-1dp;

    position: absolute;
    z-index: 8;
    width: 100%;
    padding: 0;
    margin: 0;
    // Move up snug against the textbox
    margin-top: -2em;
    list-style-type: none;
  }

</style>
