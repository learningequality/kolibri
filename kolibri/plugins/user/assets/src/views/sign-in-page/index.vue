<template>

  <div class="login">
    <div id="login-container">
      <logo class="logo"/>
      <h1 class="login-text title">{{ $tr('kolibri') }}</h1>
      <form id="login-form" ref="form" @submit.prevent="signIn">
        <transition name="textbox">
          <k-textbox
            :label="$tr('username')"
            id="username"
            v-model="username"
            required
            autofocus
            @focus="showDropdown = true"
            @blur="showDropdown = false"
            @keydown="handleKeyboardNav"/>
        </transition>
        <transition name="list">
          <ul
            class="suggestions"
            v-if="simpleLogin && suggestions.length && !uniqueMatch"
            v-show="showDropdown">
            <ui-autocomplete-suggestion v-for="(suggestion, i) in suggestions"
              :suggestion="suggestion"
              @click.native="fillUsername(suggestion)"
              :class="{ highlighted: highlightedIndex === i }"/>
          </ul>
        </transition>
        <transition name="textbox">
          <k-textbox
            :label="$tr('password')"
            v-if="(!simpleLogin || (simpleLogin && (passwordMissing || invalidCredentials)))"
            id="password"
            type="password"
            v-model="password"
            autocomplete="current-password"
            :autofocus="simpleLogin"
            :required="!simpleLogin"
            :invalid="passwordMissing"
            :invalidText="passwordMissing ? $tr('enterPassword') : ''"/>
        </transition>
        <k-button id="login-btn" :text="$tr('signIn')" :primary="true" type="submit"/>

        <p v-if="invalidCredentials" class="sign-in-error">{{ $tr('signInError') }}</p>
      </form>
      <div id="divid-line"></div>

      <p class="login-text no-account">{{ $tr('noAccount') }}</p>
      <div id="btn-group">
        <router-link v-if="canSignUp" class="group-btn" :to="signUp">
          <k-button :text="$tr('createAccount')" :primary="false"/>
        </router-link>
        <a class="group-btn" href="/learn">
          <k-button :text="$tr('accessAsGuest')" :primary="false"/>
        </a>
      </div>
      <p class="login-text version">{{ versionMsg }}</p>
    </div>
  </div>

</template>


<script>

  import * as actions from 'kolibri.coreVue.vuex.actions';
  import { PageNames } from '../../constants';
  import * as getters from 'kolibri.coreVue.vuex.getters';
  import { FacilityUsernameResource } from 'kolibri.resources';
  import { LoginErrors } from 'kolibri.coreVue.vuex.constants';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import logo from 'kolibri.coreVue.components.logo';
  import uiAutocompleteSuggestion from 'keen-ui/src/UiAutocompleteSuggestion';
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
    },
    components: {
      kButton,
      kTextbox,
      logo,
      uiAutocompleteSuggestion,
    },
    data: () => ({
      username: '',
      password: '',
      usernameSuggestions: [],
      suggestionTerm: '',
      showDropdown: true,
      highlightedIndex: -1,
    }),
    watch: { username: 'setSuggestionTerm' },
    computed: {
      signUp() {
        return { name: PageNames.SIGN_UP };
      },
      versionMsg() {
        return this.$tr('poweredBy', { version: __version });
      },
      canSignUp() {
        return this.facilityConfig.learnerCanSignUp;
      },
      simpleLogin() {
        return this.facilityConfig.learnerCanLoginWithNoPassword;
      },
      suggestions() {
        // Filter suggestions on the client side so we don't hammer the server
        return this.usernameSuggestions.filter(sug =>
          sug.toLowerCase().startsWith(this.username.toLowerCase())
        );
      },
      uniqueMatch() {
        // If we have a matching username entered, don't show any suggestions.
        return (
          this.suggestions.length === 1 &&
          this.suggestions[0].toLowerCase() === this.username.toLowerCase()
        );
      },
    },
    methods: {
      handleKeyboardNav(e) {
        if (this.showDropdown && this.suggestions.length) {
          switch (e.code) {
            case 'ArrowDown':
              this.highlightedIndex = Math.min(
                this.highlightedIndex + 1,
                this.suggestions.length - 1
              );
              break;
            case 'Enter':
              this.fillUsername(this.suggestions[this.highlightedIndex]);
              e.preventDefault();
              break;
            case 'Escape':
              this.showDropdown = false;
              break;
            case 'ArrowUp':
              this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
              break;
            default:
          }
        }
      },
      signIn() {
        this.kolibriLogin({
          username: this.username,
          password: this.password,
          facility: this.facility,
        });
      },
      setSuggestionTerm(newVal, oldVal) {
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
          .catch(err => {
            this.usernameSuggestions = [];
          });
      },
      fillUsername(username) {
        // Only do this if we have been passed a non-null value
        if (username !== null && typeof username !== 'undefined') {
          this.username = username;
          this.showDropdown = false;
        }
      },
    },
    vuex: {
      getters: {
        facilityConfig: getters.facilityConfig,
        invalidCredentials: state => state.core.loginError === LoginErrors.INVALID_CREDENTIALS,
        passwordMissing: state => state.core.loginError === LoginErrors.PASSWORD_MISSING,
        facility: getters.currentFacilityId,
      },
      actions: { kolibriLogin: actions.kolibriLogin },
    },
  };

</script>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  $login-text = #D8D8D8

  #login-container
    .ui-
      &textbox__
        &label-text
          color: $login-text
        &input
          border-bottom-color: $login-text
          color: $login-text
          &:autofill
            background-color: transparent
      &button
        background-color: $login-red

</style>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $login-overlay = #201A21
  $login-text = #D8D8D8

  .login
    background-color: $login-overlay
    height: 100%
    // Fallback for older browers.
    background: $core-bg-canvas
    background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(./background.png) no-repeat center center fixed
    background-size: cover
    overflow: hidden

  #login-container
    display: block
    margin: auto

  .logo
    position: relative
    display: block
    margin: auto
    margin-top: 34px
    width: 30%
    height: auto
    max-width: 120px
    min-width: 60px

  .login-text
    color: $login-text

  .title
    font-weight: 100
    font-size: 1.3em
    letter-spacing: 0.1em
    text-align: center

  #login-form
    width: 70%
    max-width: 300px
    margin: auto
    margin-top: 30px
    position: relative

  #password
    margin-top: 30px

  #login-btn
    display: block
    margin: auto
    margin-top: 38px
    width: 100%

  #btn-group
    display: table
    margin: auto
    margin-top: 28px
    margin-bottom: 20px
    text-align: center

  .group-btn
    padding: 5px
    display: inline-block
    text-decoration: none

  #divid-line
    width: 412px
    height: 1px
    background-color: $core-text-annotation
    background-color: $login-text
    margin: auto
    margin-top: 24px

  .version
    text-align: center
    font-size: 0.8em

  .no-account
    text-align: center

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

</style>
