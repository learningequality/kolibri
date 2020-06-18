<template>

  <div class="fh">

    <AuthBase>

      <!-- Multi-facility selection -->
      <div v-if="hasMultipleFacilities || showFacilityName" style="margin: 16px 0;">
        <span v-if="showFacilityName" style="margin-right: 8px;">
          {{ $tr("signInToFacilityLabel", { facility: selectedFacility.name }) }}
        </span>
        <KRouterLink
          v-if="hasMultipleFacilities"
          :text="$tr('changeLabel')"
          :to="{
            name: PageNames.FACILITY_SELECT,
            query: { next: PageNames.SIGN_IN, backTo: PageNames.SIGN_IN }
          }"
        />
      </div>

      <!-- User Listing Flow - App Context Specific -->
      <!-- Password creation flow - note: not the first thing seen -->
      <div v-if="needsToCreatePassword" style="text-align: left">
        <KButton
          appearance="basic-link"
          text=""
          style="margin-bottom: 16px;"
          @click="unselectListUser"
        >
          <KIcon
            :icon="back"
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
        <p>{{ $tr("needToMakeNewPasswordLabel", { user: selectedListUser.username }) }}</p>
        <PasswordTextbox
          ref="createPassword"
          :autofocus="true"
          :disabled="updatingPassword"
          :value.sync="createdPassword"
          :isValid.sync="createdPasswordConfirmation"
          :shouldValidate="updatingPassword"
          @submitNewPassword="updatePasswordAndSignIn"
        />
        <KButton
          appearance="raised-button"
          :primary="true"
          :text="coreString('continueAction')"
          style="margin: 24px auto 0; display:block;"
          :disabled="updatingPassword"
          @click="updatePasswordAndSignIn"
        />

      </div>

      <!-- This is the base list of users -->
      <!-- Only shown in app context with <= 16 users in facility -->
      <UsersList
        v-else-if="shouldShowUsersList"
        :users="usersForCurrentFacility"
        @userSelected="setSelectedListUser"
      />

      <!-- Password Form for selected user -->
      <div v-else-if="shouldShowPasswordForm" style="text-align: left">
        <KButton
          appearance="basic-link"
          text=""
          style="margin-bottom: 16px;"
          @click="unselectListUser"
        >
          <mat-svg
            name="arrow_back"
            category="navigation"
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

        <p v-if="selectedListUser.username" style="padding: 8px 0;">
          {{ $tr("greetUser", { user: selectedListUser.username }) }}
        </p>

        <form ref="form" class="login-form" @submit.prevent="signIn">
          <UiAlert
            v-if="invalidCredentials"
            type="error"
            :dismissible="false"
          >
            {{ $tr('signInError') }}
          </UiAlert>
          <transition name="textbox">
            <KTextbox
              v-show="false"
              id="list-username"
              ref="list-username"
              v-model="username"
              autocomplete="username"
              :autofocus="!hasMultipleFacilities"
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
          <transition name="textbox">
            <KTextbox
              id="list-password"
              ref="list-password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              :label="coreString('passwordLabel')"
              :autofocus="true"
              :invalid="passwordIsInvalid"
              :invalidText="passwordIsInvalidText"
              :floatingLabel="false"
              @blur="passwordBlurred = true"
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
        </form>
      </div>

      <!-- End User Listing Flow -->
      <form v-else ref="form" class="login-form" @submit.prevent="signIn">
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
            :autofocus="!hasMultipleFacilities"
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
            @click="setSelectedListUser(null)"
          />
        </div>
      </form>

    </AuthBase>

  </div>

</template>


<script>

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
  import { PageNames } from '../constants';
  import getUrlParameter from './getUrlParameter';
  import AuthBase from './AuthBase';
  import UsersList from './UsersList';
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
      UiAutocompleteSuggestion,
      UiAlert,
      UsersList,
      PasswordTextbox,
    },
    mixins: [responsiveWindowMixin, commonCoreStrings],
    data() {
      return {
        username: '',
        password: '',
        usernameSuggestions: [],
        suggestionTerm: '',
        showDropdown: true,
        highlightedIndex: -1,
        usernameBlurred: false,
        passwordBlurred: false,
        formSubmitted: false,
        selectedListUser: null,
        needsToCreatePassword: false,
        createdPassword: '',
        createdPasswordConfirmation: '',
        updatingPassword: false,
      };
    },
    computed: {
      ...mapGetters(['facilityConfig', 'selectedFacility', 'isAppContext']),
      ...mapState(['facilityId']), // backend's default facility on load
      ...mapState('signIn', ['hasMultipleFacilities']),
      ...mapState({
        invalidCredentials: state => state.core.loginError === LoginErrors.INVALID_CREDENTIALS,
        busy: state => state.core.signInBusy,
      }),
      simpleSignIn() {
        return this.facilityConfig.learner_can_login_with_no_password;
      },
      shouldShowUsersList() {
        return (
          this.usersForCurrentFacility.length <= MAX_USERS_FOR_LISTING_VIEW &&
          this.isAppContext &&
          !this.selectedListUser
        );
      },
      shouldShowPasswordForm() {
        return Boolean(this.selectedListUser);
      },
      suggestions() {
        // Filter suggestions on the client side so we don't hammer the server
        return this.usernameSuggestions.filter(sug =>
          sug.toLowerCase().startsWith(this.username.toLowerCase())
        );
      },
      allUsers() {
        return plugin_data.deviceUsers || [];
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
      usersForCurrentFacility() {
        return this.allUsers.filter(user => user.facility_id === this.facilityId);
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
        this.setSuggestionTerm(newVal);
      },
    },
    methods: {
      ...mapActions(['kolibriLogin', 'kolibriLoginWithNewPassword', 'clearLoginError']),
      unselectListUser() {
        // Going back to the beginning - undo what we may have
        // changed so far and clearing the errors, if any
        this.clearLoginError().then(() => {
          this.username = '';
          this.password = '';
          this.selectedListUser = null;
          this.needsToCreatePassword = false;
        });
      },
      // Sets the selected list user and/or logs them in
      setSelectedListUser(user) {
        // If we get a user - then use it's username, otherwise, we should already
        // have a username in our data()
        if (user) {
          this.username = user.username;
        } else {
          user = this.usersForCurrentFacility.find(u => u.username === this.username) || {
            needs_password: false,
            username: this.username,
            facility: '',
          };
        }
        // If the user is a learner and we don't require passwords sign them in
        if (this.simpleSignIn && user.is_learner) {
          this.signIn();
          return;
        } else {
          this.selectedListUser = user;
          if (user.needs_password) {
            // If they need to make a password, force them to make it
            this.needsToCreatePassword = true;
          } else {
            this.selectedListUser = user;
          }
        }
      },
      updatePasswordAndSignIn() {
        this.updatingPassword = true;
        const payload = {
          username: this.username,
          password: this.createdPassword,
          facility: this.facilityId,
          user: this.selectedListUser,
        };
        this.kolibriLoginWithNewPassword(payload).catch();
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
            facility: this.facility,
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
          case 'Enter':
            if (this.highlightedIndex < 0) {
              this.showDropdown = false;
              this.setSelectedListUser(null);
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
      handleUsernameBlur() {
        this.usernameBlurred = true;
        this.showDropdown = false;
      },
      signIn() {
        this.formSubmitted = true;
        if (this.formIsValid) {
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
          this.kolibriLogin(sessionPayload).catch();
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        if (this.usernameIsInvalid) {
          this.$refs.username.focus();
        } else if (this.passwordIsInvalid) {
          this.$refs.password.focus();
        }
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
