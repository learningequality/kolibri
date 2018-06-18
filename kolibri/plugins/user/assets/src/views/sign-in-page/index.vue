<template>

  <div class="fh">

    <facility-modal
      v-if="facilityModalVisible"
      @close="closeFacilityModal"
    />

    <div class="wrapper-table">
      <div class="main-row">
        <div class="main-cell">
          <div class="box">
            <logo
              class="logo"
              :style="{'height': `${logoHeight}px`}"
            />
            <h1 :style="{'font-size': `${logoTextSize}px`}">
              {{ $tr('kolibri') }}
            </h1>
            <form class="login-form" ref="form" @submit.prevent="signIn">
              <ui-alert
                v-if="invalidCredentials"
                type="error"
                :dismissible="false"
              >
                {{ $tr('signInError') }}
              </ui-alert>
              <transition name="textbox">
                <k-textbox
                  ref="username"
                  id="username"
                  autocomplete="username"
                  :autofocus="!hasMultipleFacilities"
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
                  v-if="needPasswordField"
                  ref="password"
                  id="password"
                  type="password"
                  autocomplete="current-password"
                  :label="$tr('password')"
                  :autofocus="simpleSignIn"
                  :invalid="passwordIsInvalid"
                  :invalidText="passwordIsInvalidText"
                  :floatingLabel="!autoFilledByChromeAndNotEdited"
                  @blur="passwordBlurred = true"
                  @input="handlePasswordChanged"
                  v-model="password"
                />
              </transition>
              <div>
                <k-button
                  class="login-btn"
                  type="submit"
                  :text="$tr('signIn')"
                  :primary="true"
                  :disabled="busy"
                />
              </div>
            </form>

            <k-router-link
              v-if="canSignUp"
              class="create-button"
              :text="$tr('createAccount')"
              :to="signUpPage"
              :primary="true"
              appearance="flat-button"
            />
            <div>
              <k-external-link
                class="guest-button"
                :text="$tr('accessAsGuest')"
                href="/learn"
                :primary="true"
                appearance="basic-link"
              />
            </div>
            <p class="version">{{ versionMsg }}</p>
          </div>
        </div>
      </div>
      <div class="footer-row">
        <language-switcher-footer class="footer-cell" />
      </div>
    </div>

  </div>

</template>


<script>

  import { kolibriLogin } from 'kolibri.coreVue.vuex.actions';
  import { facilityConfig } from 'kolibri.coreVue.vuex.getters';
  import { FacilityUsernameResource } from 'kolibri.resources';
  import { LoginErrors } from 'kolibri.coreVue.vuex.constants';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kExternalLink from 'kolibri.coreVue.components.kExternalLink';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import logo from 'kolibri.coreVue.components.logo';
  import uiAutocompleteSuggestion from 'keen-ui/src/UiAutocompleteSuggestion';
  import uiAlert from 'keen-ui/src/UiAlert';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import { PageNames } from '../../constants';
  import languageSwitcherFooter from '../language-switcher-footer';
  import facilityModal from './facility-modal';

  export default {
    name: 'signInPage',
    $trs: {
      kolibri: 'Kolibri',
      signIn: 'Sign in',
      username: 'Username',
      password: 'Password',
      enterPassword: 'Enter password',
      createAccount: 'Create an account',
      accessAsGuest: 'Continue as guest',
      signInError: 'Incorrect username or password',
      poweredBy: 'Kolibri {version}',
      required: 'This field is required',
      requiredForCoachesAdmins: 'Password is required for coaches and admins',
    },
    components: {
      kButton,
      kRouterLink,
      kExternalLink,
      kTextbox,
      facilityModal,
      logo,
      uiAutocompleteSuggestion,
      uiAlert,
      languageSwitcherFooter,
    },
    mixins: [responsiveWindow],
    data() {
      return {
        username: '',
        password: '',
        usernameSuggestions: [],
        facilityModalVisible: this.hasMultipleFacilities,
        suggestionTerm: '',
        showDropdown: true,
        highlightedIndex: -1,
        usernameBlurred: false,
        passwordBlurred: false,
        formSubmitted: false,
        autoFilledByChromeAndNotEdited: false,
      };
    },
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
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
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
            return this.$tr('required');
          }
        }
        return '';
      },
      passwordIsInvalid() {
        // prevent validation from showing when we only think that the password is empty
        if (this.autoFilledByChromeAndNotEdited) {
          return false;
        }
        return Boolean(this.passwordIsInvalidText);
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
      hasServerError() {
        return Boolean(this.passwordMissing || this.invalidCredentials);
      },
      needPasswordField() {
        return !this.simpleSignIn || this.hasServerError;
      },
      logoHeight() {
        const CRITICAL_ACTIONS_HEIGHT = 350; // title + form + action buttons
        let height = this.windowSize.height - CRITICAL_ACTIONS_HEIGHT - 32;
        height = Math.max(height, 32);
        height = Math.min(height, 80);
        return height;
      },
      logoTextSize() {
        return Math.floor(this.logoHeight * 0.3);
      },
    },
    watch: {
      username: 'setSuggestionTerm',
    },
    mounted() {
      /*
        Chrome has non-standard behavior with auto-filled text fields where
        the value shows up as an empty string even though there is text in
        the field:
          https://bugs.chromium.org/p/chromium/issues/detail?id=669724
        As super-brittle hack to detect the presence of auto-filled text and
        work-around it, we look for a change in background color as described
        here:
          https://stackoverflow.com/a/35783761
      */
      setTimeout(() => {
        const bgColor = window.getComputedStyle(this.$refs.username.$el.querySelector('input'))
          .backgroundColor;

        if (bgColor === 'rgb(250, 255, 189)') {
          this.autoFilledByChromeAndNotEdited = true;
        }
      }, 250);
    },
    methods: {
      closeFacilityModal() {
        this.facilityModalVisible = false;
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
          this.kolibriLogin({
            username: this.username,
            password: this.password,
            facility: this.facilityId,
          }).catch();
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
      handlePasswordChanged() {
        this.autoFilledByChromeAndNotEdited = false;
      },
    },
    vuex: {
      getters: {
        // backend's default facility on load
        facilityId: state => state.facilityId,
        facilityConfig,
        hasMultipleFacilities: state => state.pageState.hasMultipleFacilities,
        passwordMissing: state => state.core.loginError === LoginErrors.PASSWORD_MISSING,
        invalidCredentials: state => state.core.loginError === LoginErrors.INVALID_CREDENTIALS,
        busy: state => state.core.signInBusy,
      },
      actions: {
        kolibriLogin,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .fh
    height: 100%

  .wrapper-table
    text-align: center
    width: 100%
    height: 100%
    display: table

  .main-row
    display: table-row
    background-color: $core-action-normal
    background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(./background.jpg)
    background-repeat: no-repeat
    background-size: cover
    background-position: center
    text-align: center

  .main-cell
    display: table-cell
    vertical-align: middle
    height: 100%

  .box
    width: 300px
    background-color: $core-bg-light
    margin: 16px auto
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2),
                0 1px 1px 0 rgba(0, 0, 0, 0.14),
                0 2px 1px -1px rgba(0, 0, 0, 0.12)

  .logo
    margin-top: 16px

  .login-form
    width: 70%
    max-width: 300px
    position: relative
    text-align: left
    margin: auto

  .login-btn
    width: calc(100% - 16px)

  .version
    font-size: 0.8em
    margin-top: 24px
    margin-bottom: 0
    padding-bottom: 16px

  .footer-row
    display: table-row
    background-color: $core-bg-light

  .footer-cell
    display: table-cell
    vertical-align: middle
    min-height: 56px
    padding: 16px

  .suggestions
    background-color: white
    box-shadow: 1px 2px 8px darken(white, 10%)
    list-style-type: none
    margin: 0
    width: 100%
    padding: 0
    z-index: 8
    // Move up snug against the textbox
    margin-top: -2em
    position: absolute

  .highlighted
    background-color: $core-grey

  .textbox-enter-active
    transition: opacity 0.5s

  .textbox-enter
    opacity: 0

  .list-leave-active
    transition: opacity 0.1s

  .textbox-leave
    transform: opacity 0

  h1
    font-size: 1.5em
    font-weight: 100
    color: #9174a9
    margin-top: 0

  .create-button
    margin-top: 16px

  .guest-button
    font-size: 14px

</style>
