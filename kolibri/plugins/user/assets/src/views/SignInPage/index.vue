<template>

  <CoreBase
    :immersivePage="false"
    :immersivePagePrimary="false"
    :fullScreen="true"
  >
    <AuthBase>
      <div v-if="!needsToCreatePassword">
        <!-- ** Text and Backlinks ** -->

        <!-- In MFD show return to facility select when not asking for password -->
        <KRouterLink
          v-if="hasMultipleFacilities && !showPasswordForm"
          icon="back"
          :text="$tr('changeFacility')"
          :to="backToFacilitySelectionRoute"
          style="margin-top: 24px; text-align: left; width: 100%;"
        />

        <!-- When password form shows, show a change user link -->
        <!-- Not using v-else here to be more explicit -->
        <KButton
          v-if="showPasswordForm"
          appearance="basic-link"
          :text="$tr('changeUser')"
          style="margin-top: 24px; text-align: left; width: 100%;"
          @click="clearUser"
        >
          <KIcon slot="icon" icon="back" :color="$themeTokens.primary" />
        </KButton>

        <SignInHeading 
          :showFacilityName="showFacilityName" 
          :showPasswordForm="showPasswordForm"
        />

        <!-- END Text & Backlinks -->

        <!-- 
          USERNAME FORM
          Presented to user **unless** we are in app context AND have <= 16 users in the facility
          TODO: Extract this into a separate component. We're post string freeze and short on time right now
        -->
        <form ref="form" class="login-form" @submit.prevent="signIn">
          <div v-show="showUsernameForm">
            <UiAlert
              v-if="invalidCredentials"
              type="error"
              :dismissible="false"
            >
              {{ $tr('signInError') }}
            </UiAlert>
            <transition name="textbox">
              <KTextbox
                id="username"
                ref="username"
                v-model="username"
                autocomplete="username"
                :autofocus="true"
                :label="coreString('usernameLabel')"
                :invalid="usernameIsInvalid"
                :invalidText="usernameIsInvalidText"
                @blur="handleUsernameBlur"
                @input="showDropdown = true"
                @keydown="handleKeyboardNav"
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
                :disabled="busy"
                @click="signIn"
              />
            </div>
          </div>
          <div v-show="showPasswordForm">
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

      <!-- TODO: This can be its own separate component -->
      <!-- Learner was created without a password, but now must create one. -->
      <div v-else style="text-align: left">
        <KButton
          appearance="basic-link"
          text=""
          style="margin-bottom: 16px;"
          @click="clearUser"
        >
          <KIcon
            slot="icon"
            icon="back"
            :style="{
              fill: $themeTokens.primary,
              height: '1.125em',
              width: '1.125em',
              position: 'relative',
              marginRight: '8px',
              top: '2px',
            }"
          />{{ coreString('goBackAction') }}
        </KButton>
        <p>{{ $tr("needToMakeNewPasswordLabel", { user: username }) }}</p>
        <PasswordTextbox
          ref="createPassword"
          :autofocus="true"
          :disabled="busy"
          :value.sync="createdPassword"
          :isValid.sync="createdPasswordConfirmation"
          :shouldValidate="busy"
          @submitNewPassword="updatePasswordAndSignIn"
        />
        <KButton
          appearance="raised-button"
          :primary="true"
          :text="coreString('continueAction')"
          style="margin: 24px auto 0; display:block;"
          :disabled="busy"
          @click="updatePasswordAndSignIn"
        />
      </div>
      <!-- End TODO about making this its own component -->

    </AuthBase>
  </CoreBase>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { mapState, mapGetters, mapActions } from 'vuex';
  import { FacilityUsernameResource } from 'kolibri.resources';
  import get from 'lodash/get';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { LoginErrors } from 'kolibri.coreVue.vuex.constants';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import { validateUsername } from 'kolibri.utils.validators';
  import UiAutocompleteSuggestion from 'kolibri-design-system/lib/keen/UiAutocompleteSuggestion';
  import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import { ComponentMap, PageNames } from '../../constants';
  import getUrlParameter from '../getUrlParameter';
  import AuthBase from '../AuthBase';
  import UsersList from '../UsersList';
  import SignInHeading from './SignInHeading';
  import plugin_data from 'plugin_data';

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
      CoreBase,
      PasswordTextbox,
      SignInHeading,
      UiAutocompleteSuggestion,
      UiAlert,
      UsersList,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    data() {
      return {
        usernameSuggestions: [],
        usernamesForCurrentFacility: [],
        suggestionTerm: '',
        showDropdown: true,
        highlightedIndex: -1,
        usernameBlurred: false,
        passwordBlurred: false,
        formSubmitted: false,
        createdPassword: '',
        createdPasswordConfirmation: '',
        busy: false,
        loginError: null,
      };
    },
    computed: {
      ...mapGetters(['selectedFacility', 'isAppContext']),
      ...mapState('signIn', ['hasMultipleFacilities']),
      username: {
        get() {
          return this.$store.state.signIn.username;
        },
        set(username) {
          this.$store.commit('signIn/SET_USERNAME', username);
        },
      },
      password: {
        get() {
          return this.$store.state.signIn.password;
        },
        set(password) {
          this.$store.commit('signIn/SET_PASSWORD', password);
        },
      },
      backToFacilitySelectionRoute() {
        const facilityRoute = this.$router.getRoute(ComponentMap.FACILITY_SELECT);
        const whereToNext = this.$router.getRoute(ComponentMap.SIGN_IN);
        return { ...facilityRoute, params: { whereToNext } };
      },
      showPasswordForm() {
        return Boolean(this.username) && (this.passwordMissing || this.invalidCredentials);
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
      simpleSignIn() {
        return this.selectedFacility.dataset.learner_can_login_with_no_password;
      },
      showUsersList() {
        return this.selectedFacility.num_users <= MAX_USERS_FOR_LISTING_VIEW && this.isAppContext;
      },
      suggestions() {
        // Filter suggestions on the client side so we don't hammer the server
        return this.usernameSuggestions.filter(sug =>
          sug.toLowerCase().startsWith(this.username.toLowerCase())
        );
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.coreString('requiredFieldError');
          } else if (!validateUsername(this.username)) {
            return this.coreString('usernameNotAlphaNumError');
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
      formIsValid() {
        if (this.simpleSignIn) {
          return !this.usernameIsInvalid;
        }
        return !this.usernameIsInvalid && !this.passwordIsInvalid;
      },
      nextParam() {
        // query is after hash
        if (this.$route.query.next) {
          return this.$route.query.next;
        }
        // query is before hash
        return getUrlParameter('next');
      },
      PageNames() {
        return PageNames;
      },
      showFacilityName() {
        return (
          this.hasMultipleFacilities || get(this.selectedFacility, 'dataset.preset') !== 'informal'
        );
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
          this.$nextTick(() => this.$refs.password.focus());
        }
      },
      showUsernameForm(b) {
        if (b) {
          this.$nextTick(() => this.$refs.username.focus());
        }
      },
    },
    // Clear the username when entering the route.
    // username may be held over if you select a user from UsersList
    // then change to a facility that doesn't use UsersList
    //
    // TODO: If we want to clear the username whenever we switch facilities,
    // then we can remove the `beforeRouteEnter` and use the commented out
    // `beforeRouteLeave` below
    beforeRouteEnter(to, from, next) {
      next(vm => vm.$store.commit('signIn/RESET_FORM_VALUES'));
    },
    // Clear the username before changing routes to FacilitySelect?
    /*
    beforeRouteLeave(to, from, next) {
      if(to.name === ComponentMap.FACILITY_SELECT) {
        this.$store.commit('signIn/RESET_FORM_VALUES')
      }
      next();
    },
    */
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
      ...mapActions(['kolibriLogin', 'kolibriSetUnspecifiedPassword']),
      clearUser() {
        // Going back to the beginning - undo what we may have
        // changed so far and clearing the errors, if any
        this.username = '';
        this.password = '';
        // This ensures we don't get '<field> required' when going back
        // and forth
        this.usernameBlurred = false;
        this.passwordBlurred = false;
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
      updatePasswordAndSignIn() {
        this.busy = true;
        const payload = {
          username: this.username,
          password: this.createdPassword,
          facility: this.selectedFacility.id,
        };
        this.kolibriSetUnspecifiedPassword(payload).then(() => {
          // Password successfully set
          // Use this password now to sign in
          this.password = this.createdPassword;
          this.signIn();
        });
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
      handleKeyboardNav(e) {
        switch (e.code) {
          case 'ArrowDown':
            if (this.showDropdown && this.suggestions.length) {
              this.highlightedIndex = Math.min(
                this.highlightedIndex + 1,
                this.suggestions.length - 1
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
            if (this.highlightedIndex < 0) {
              this.showDropdown = false;
              this.signIn();
            } else {
              this.fillUsername(this.suggestions[this.highlightedIndex]);
              e.preventDefault();
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
      validateAndSignIn() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.signIn();
        } else {
          this.focusOnInvalidField();
        }
      },
      signIn() {
        this.busy = true;
        const sessionPayload = {
          username: this.username,
          password: this.password,
          facility: this.selectedFacility.id,
        };

        if (plugin_data.oidcProviderEnabled) {
          sessionPayload['next'] = this.nextParam;
        } else if (this.$route.query.redirect && !this.nextParam) {
          // Go to URL in 'redirect' query param, if arriving from AuthMessage
          sessionPayload['next'] = this.$route.query.redirect;
        }

        this.kolibriLogin(sessionPayload)
          .then(err => {
            if (err) {
              this.loginError = err;
            }
            this.busy = false;
          })
          .catch(e => {
            console.log(e);
            this.busy = false;
          });
      },
      focusOnInvalidField() {
        this.$nextTick(() => {
          if (this.usernameIsInvalid) {
            this.$refs.username.focus();
          } else if (this.passwordIsInvalid) {
            this.$refs.password.focus();
          }
        });
      },
      suggestionStyle(i) {
        return {
          backgroundColor: this.highlightedIndex === i ? this.$themePalette.grey.v_200 : '',
        };
      },
    },
    $trs: {
      changeLabel: {
        message: 'Change',
        context:
          '(verb) Link to change the facility to sign in when the device has more than one facility',
      },
      signInError: 'Incorrect username or password',
      signInToFacilityLabel: "Sign into '{facility}'",
      requiredForCoachesAdmins: 'Password is required for coaches and admins',
      documentTitle: 'User Sign In',
      greetUser: 'Hi, {user}',
      needToMakeNewPasswordLabel: 'Hi, {user}. You need to set a new password for your account.',
      nextLabel: 'Next',
      /* eslint-disable kolibri/vue-no-unused-translations */
      // stub out some extra strings
      signingInToFacilityAsUserLabel: "Signing in to '{facility}' as '{user}'",
      signingInAsUserLabel: "Signing in as '{user}'",
      changeUser: 'Change user',
      changeFacility: 'Change facility',
      multiFacilitySignInError: 'Incorrect username, password, or facility',
      /* eslint-enable */
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .fh {
    height: 100%;
  }

  .wrapper-table {
    display: table;
    width: 100%;
    height: 100%;
    text-align: center;
  }

  .table-row {
    display: table-row;
  }

  .main-row {
    text-align: center;
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
  }

  .table-cell {
    display: table-cell;
  }

  .main-cell {
    height: 100%;
    vertical-align: middle;
  }

  .box {
    @extend %dropshadow-16dp;

    width: 300px;
    padding: 16px 32px;
    margin: 16px auto;
    border-radius: $radius;
  }

  .login-form {
    text-align: left;
  }

  .login-btn {
    width: calc(100% - 16px);
    margin-top: 16px;
  }

  .create {
    margin-top: 32px;
    margin-bottom: 8px;
  }

  .guest {
    margin-top: 8px;
    margin-bottom: 16px;
  }

  .small-text {
    font-size: 0.8em;
  }

  .version-string {
    white-space: nowrap;
  }

  .footer-cell {
    @extend %dropshadow-8dp;

    padding: 16px;
  }

  .footer-cell .small-text {
    margin-top: 8px;
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

  .textbox-enter-active {
    transition: opacity 0.5s;
  }

  .textbox-enter {
    opacity: 0;
  }

  .list-leave-active {
    transition: opacity 0.1s;
  }

  .textbox-leave {
    transition: opacity 0s;
  }

  .logo {
    width: 100%;
    max-width: 65vh; // not compatible with older browsers
    height: auto;
  }

  .kolibri-title {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 24px;
    font-weight: 100;
  }

  .footer-logo {
    position: relative;
    top: -1px;
    display: inline-block;
    height: 24px;
    margin-right: 10px;
    margin-left: 8px;
    vertical-align: middle;
  }

</style>
