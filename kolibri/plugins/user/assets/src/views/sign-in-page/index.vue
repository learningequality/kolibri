<template>

  <div class="fh">
    <div class="wrapper-table">
      <div class="main-row"><div id="main-cell">
        <logo class="logo" />
        <h1 class="login-text title">{{ $tr('kolibri') }}</h1>
        <form class="login-form" ref="form" @submit.prevent="signIn">
          <ui-alert
            v-if="invalidCredentials"
            type="error"
            class="alert"
            :dismissible="false"
          >
            {{ $tr('signInError') }}
          </ui-alert>
          <transition name="textbox">
            <k-textbox
              ref="username"
              id="username"
              autocomplete="username"
              :autofocus="true"
              :label="$tr('username')"
              :invalid="usernameIsInvalid"
              :invalidText="usernameIsInvalidText"
              @blur="handleUsernameBlur"
              @input="showDropdown = true"
              @keydown="handleKeyboardNav"
              v-model="username"
            />
          </transition>
          <transition name="list">
            <ul
              v-if="simpleSignIn && suggestions.length"
              v-show="showDropdown"
              class="suggestions"
            >
              <ui-autocomplete-suggestion
                v-for="(suggestion, i) in suggestions"
                :key="i"
                :suggestion="suggestion"
                :class="{ highlighted: highlightedIndex === i }"
                @click.native="fillUsername(suggestion)"
              />
            </ul>
          </transition>
          <transition name="textbox">
            <k-textbox
              v-if="(!simpleSignIn || (simpleSignIn && (passwordMissing || invalidCredentials)))"
              ref="password"
              id="password"
              type="password"
              autocomplete="current-password"
              :label="$tr('password')"
              :autofocus="simpleSignIn"
              :invalid="passwordIsInvalid"
              :invalidText="passwordIsInvalidText"
              @blur="passwordBlurred = true"
              v-model="password"
            />
          </transition>
          <k-button
            class="login-btn"
            type="submit"
            :text="$tr('signIn')"
            :primary="true"
            :disabled="busy"
          />
        </form>
        <div class="divider"></div>

        <p class="login-text no-account">{{ $tr('noAccount') }}</p>
        <div>
          <k-router-link
            v-if="canSignUp"
            :text="$tr('createAccount')"
            :to="signUpPage"
            :primary="false"
            appearance="raised-button"
          />
        </div>
        <div>
          <k-external-link
            :text="$tr('accessAsGuest')"
            href="/learn"
            :primary="false"
            appearance="flat-button"
          />
        </div>
        <p class="login-text version">{{ versionMsg }}</p>
      </div></div>
      <div class="footer-row">
        <language-switcher-footer class="footer-cell" />
      </div>
    </div>
    <core-snackbar
      v-if="showSignedOutDueToInactivitySnackbar"
      :text="$tr('signedOut')"
      :actionText="$tr('dismiss')"
      @actionClicked="clearSnackbar"
    />
  </div>

</template>


<script>

  import { kolibriLogin, clearSnackbar } from 'kolibri.coreVue.vuex.actions';
  import { PageNames } from '../../constants';
  import { facilityConfig, currentFacilityId, currentSnackbar } from 'kolibri.coreVue.vuex.getters';
  import { FacilityUsernameResource } from 'kolibri.resources';
  import { LoginErrors, SignedOutDueToInactivitySnackbar } from 'kolibri.coreVue.vuex.constants';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kExternalLink from 'kolibri.coreVue.components.kExternalLink';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import logo from 'kolibri.coreVue.components.logo';
  import uiAutocompleteSuggestion from 'keen-ui/src/UiAutocompleteSuggestion';
  import uiAlert from 'keen-ui/src/UiAlert';
  import languageSwitcherFooter from '../language-switcher-footer';
  import coreSnackbar from 'kolibri.coreVue.components.coreSnackbar';

  export default {
    name: 'signInPage',
    $trs: {
      kolibri: 'Kolibri',
      signIn: 'Sign in',
      username: 'Username',
      password: 'Password',
      enterPassword: 'Enter password',
      noAccount: `Don't have an account?`,
      createAccount: 'Create account',
      accessAsGuest: 'Access as guest',
      signInError: 'Incorrect username or password',
      poweredBy: 'Kolibri {version}',
      required: 'This field is required',
      requiredForCoachesAdmins: 'Password is required for coaches and admins',
      signedOut: 'You were automatically signed out due to inactivity',
      dismiss: 'Dismiss',
    },
    components: {
      kButton,
      kRouterLink,
      kExternalLink,
      kTextbox,
      logo,
      uiAutocompleteSuggestion,
      uiAlert,
      languageSwitcherFooter,
      coreSnackbar,
    },
    data: () => ({
      username: '',
      password: '',
      usernameSuggestions: [],
      suggestionTerm: '',
      showDropdown: true,
      highlightedIndex: -1,
      usernameBlurred: false,
      passwordBlurred: false,
      formSubmitted: false,
    }),
    computed: {
      simpleSignIn() {
        return this.facilityConfig.learnerCanLoginWithNoPassword;
      },
      suggestions() {
        // Filter suggestions on the client side so we don't hammer the server
        return this.usernameSuggestions.filter(sug =>
          sug.toLowerCase().startsWith(this.username.toLowerCase())
        );
      },
      // TODO: not used
      uniqueMatch() {
        // If we have a matching username entered, don't show any suggestions.
        return (
          this.suggestions.length === 1 &&
          this.suggestions[0].toLowerCase() === this.username.toLowerCase()
        );
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return !!this.usernameIsInvalidText;
      },
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.formSubmitted) {
          if (this.simpleSignIn && this.password === '') {
            return this.$tr('requiredForCoachesAdmins');
          } else if (this.password === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      passwordIsInvalid() {
        return !!this.passwordIsInvalidText;
      },
      formIsValid() {
        if (this.simpleSignIn) {
          return !this.usernameIsInvalid;
        }
        return !this.usernameIsInvalid && !this.passwordIsInvalid;
      },
      canSignUp() {
        return this.facilityConfig.learnerCanSignUp;
      },
      signUpPage() {
        return { name: PageNames.SIGN_UP };
      },
      versionMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
      showSignedOutDueToInactivitySnackbar() {
        return this.currentSnackbar === SignedOutDueToInactivitySnackbar;
      },
    },
    watch: { username: 'setSuggestionTerm' },
    methods: {
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
        FacilityUsernameResource.getCollection({
          facility: this.facility,
          search: this.suggestionTerm,
        })
          .fetch()
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
          this.$refs.username.$el.querySelector('input').focus();
        }
      },
      handleUsernameBlur() {
        this.usernameBlurred = true;
        this.showDropdown = false;
      },
      signIn() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.kolibriLogin({
            username: this.username,
            password: this.password,
            facility: this.facility,
          });
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
    },
    vuex: {
      getters: {
        facility: currentFacilityId,
        facilityConfig,
        passwordMissing: state => state.core.loginError === LoginErrors.PASSWORD_MISSING,
        invalidCredentials: state => state.core.loginError === LoginErrors.INVALID_CREDENTIALS,
        busy: state => state.core.signInBusy,
        currentSnackbar,
      },
      actions: {
        kolibriLogin,
        clearSnackbar,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $login-text = #D8D8D8

  #main-cell >>>
    .ui-
      &textbox__
        &label-text
          color: $login-text
        &input
          border-bottom-color: $login-text
          color: $login-text
          &:autofill
            background-color: transparent

    .button.secondary.raised
      background-color: $core-text-default
      color: $core-grey

      &:hover
        background-color: #0E0E0E

    .button.secondary.flat
      color: $core-grey
      font-weight: normal

      &:hover
        background: none

  .fh
    height: 100%

  .fh
    height: 100%

  .wrapper-table
    text-align: center
    background-color: #201A21
    width: 100%
    height: 100%
    display: table

  .main-row
    display: table-row

  #main-cell
    background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(./background.png) no-repeat center center
    background-size: cover
    display: table-cell
    vertical-align: middle
    height: 100%

  .logo
    margin-top: 36px
    width: 120px

  .login-text
    color: $login-text

  .title
    font-size: 1.3em

  .login-form
    width: 70%
    max-width: 300px
    position: relative
    text-align: left
    margin: auto

  .login-btn
    display: block
    width: 100%

  .divider
    margin: auto
    margin-top: 48px
    margin-bottom: 36px
    width: 100%
    max-width: 412px
    height: 1px
    background-color: $core-text-annotation

  .version
    font-size: 0.8em
    margin-top: 36px
    margin-bottom: 36px

  .footer-row
    display: table-row
    background-color: $core-bg-canvas

  .footer-cell
    display: table-cell
    vertical-align: middle
    min-height: 50px
    padding: 18px

  .sign-in-error
    color: $core-text-error

  .suggestions
    background-color: white
    box-shadow: 1px 2px 8px darken(white, 10%)
    color: $core-text-default
    display: block
    list-style-type: none
    margin: 0
    width: 100%
    padding: 0
    z-index: 8
    // Move up snug against the textbox
    margin-top: -1em
    position: absolute

  .highlighted
    background-color: rgba(black, 0.10)

  .textbox-enter-active
    transition: opacity 0.5s

  .textbox-enter
    opacity: 0

  .list-leave-active
    transition: opacity 0.1s

  .textbox-leave
    transform: opacity 0

  .alert
    // Needed since alert has transparent background-color
    background-color: white

</style>
