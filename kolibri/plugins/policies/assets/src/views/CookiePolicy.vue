<template>

  <!-- The v-if ensures the page isn't visible briefly before redirection -->
  <ImmersivePage
    icon="close"
    :appBarTitle="coreString('cookiePolicy')"
    :route="cookiePolicyRoute"
  >
    <KPageContainer>
      <h1>{{ coreString('cookiePolicy') }}</h1>

      <section>
        <p>{{ $tr('cookieP1') }}</p>
        <p>{{ $tr('cookieP2') }}</p>
        <p>{{ $tr('cookieP3') }}</p>
        <p>{{ $tr('cookieP4') }}</p>

        <h2>{{ $tr('necessaryCookiesHeader') }}</h2>

        <p>{{ $tr('cookieP5') }}</p>

        <table>
          <tr>
            <th>{{ coreString('nameLabel') }}</th>
            <th>{{ $tr('cookiePurposeTableHeader') }}</th>
            <th>{{ $tr('cookieExpiryTableHeader') }}</th>
          </tr>
          <tr>
            <td>kolibri_csrftoken</td>
            <td>{{ $tr('csrftokenCookiePurpose') }}</td>
            <td>{{ $tr('twoYearExpiry') }}</td>
          </tr>
          <tr>
            <td>kolibri</td>
            <td>{{ $tr('kolibriCookiePurpose') }}</td>
            <td>{{ $tr('kolibriCookieExpiry') }}</td>
          </tr>
          <tr>
            <td>kolibri_cookie_consent</td>
            <td>{{ $tr('kolibriCookieConsentPurpose') }}</td>
            <td>{{ $tr('twoYearExpiry') }}</td>
          </tr>
        </table>
      </section>

      <section>
        <h2>{{ $tr('statisticsCookiesHeader') }}</h2>
        <p>{{ $tr('statisticsCookiesP1') }}</p>
        <table>
          <tr>
            <th>{{ coreString('nameLabel') }}</th>
            <th>{{ $tr('cookiePurposeTableHeader') }}</th>
            <th>{{ $tr('cookieExpiryTableHeader') }}</th>
          </tr>
          <tr>
            <td>visitor_id</td>
            <td>{{ $tr('visitorIdPurpose') }}</td>
            <td>{{ $tr('twoYearExpiry') }}</td>
          </tr>
        </table>
      </section>
      <section>
        <h2>{{ $tr('yourChoicesHeader') }}</h2>
        <p>{{ $tr('choicesP1', { choice: 'AYE' }) }}</p>
      </section>
      <KButton
        :text="coreString('closeAction')"
        primary
        @click="$emit('submit')"
      />
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'CookiePolicy',
    components: { ImmersivePage },
    mixins: [commonCoreStrings],
    computed: {
      cookiePolicyRoute() {
        // FIXME This will just go back to the root
        return { path: window.location.origin };
      },
    },
    $trs: {
      cookieP1: {
        message:
          "The Kolibri Learning Platform uses cookies to personalize and secure your experience, to analyze traffic, and to improve the performance and functionality of its service. Cookies are small text files that can be used by websites to make a user's experience more efficient.",
      },
      cookieP2: {
        message:
          'Current privacy laws (GDPR and CCPA) state that we can store cookies on your device if they are strictly necessary for the operation of the service. For all other types of cookies, we need your permission.',
      },
      cookieP3: {
        message:
          'The Kolibri Learning Platform uses different types of cookies. Some cookies are strictly necessary, and some are for optional analytics purposes. You can at any time change or withdraw your consent.',
      },
      cookieP4: {
        message: 'Learn more about how your data may be processed in our Usage and Privacy Policy.',
      },
      necessaryCookiesHeader: {
        message: 'Necessary Cookies',
      },
      cookieP5: {
        message:
          'Necessary cookies help make a website usable by enabling basic functions like page navigation and access to its secure areas. The website cannot function properly without these cookies.',
      },
      cookiePurposeTableHeader: {
        message: 'Purpose',
      },
      cookieExpiryTableHeader: {
        message: 'Expiry',
      },
      csrftokenCookiePurpose: {
        message:
          'To secure the login page and ensure nobody can log your browser in or perform actions on your behalf without your consent.',
      },
      kolibriCookiePurpose: {
        message:
          'To secure your logged in session and provide you with access to your personal data',
      },
      kolibriCookieExpiry: {
        message: 'Until end of session',
      },
      kolibriCookieConsentPurpose: {
        message:
          'Used to detect if the visitor has previously accepted or declined the optional cookies, and avoid needing to ask again.',
      },
      statisticsCookiesHeader: {
        message: 'Statistics Cookies',
      },
      statisticsCookiesP1: {
        message:
          'Statistics cookies help website owners understand how visitors interact with websites by collecting and reporting information anonymously.',
      },
      visitorIdPurpose: {
        message:
          'Registers a unique ID that is used to generate statistical data on how an anonymous visitor uses the website.',
      },
      twoYearExpiry: {
        message: '2 years',
      },
      yourChoicesHeader: {
        message: 'Your choices',
      },
      choicesP1: {
        message: 'You {choice} to receive statistics cookies. You can change this preference here:',
      },
    },
  };

</script>
