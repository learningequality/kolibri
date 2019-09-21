<template>

  <PageTemplate>
    <PageSection title="Overview" anchor="#overview">
      <p>
        At Learning Equality, one of our
        <ExternalLink href="https://learningequality.org/about/values/" text="core values" />
        is to
        "design for everyone". Kolibri should be accessible to the widest possible
        audience, in the broadest sense of the word 'accessible'. It should run on
        wide variety of devices, render correctly on a wide variety of screen sizes
        and assistive technologies, be understandable to people from a wide variety
        of backgrounds, and be usable by people with diverse abilities.
      </p>

      <p>
        At a high level, we follow the web content accessibility guideline that for
        all users, information should be:
      </p>

      <ul>
        <li>Perceivable</li>
        <li>Operable</li>
        <li>Understandable</li>
        <li>Robust</li>
      </ul>

    </PageSection>
    <PageSection title="Window size and zoom" anchor="#responsiveness">

      <p>
        Users will use devices that have a wide range of screen sizes. Additionally,
        some users with poor vision may zoom far in, which effectively lowers the
        size.
      </p>

      <p>
        We should aim to allow zooming up to 200%, and down to 480x600 px in both
        profile and landscape. The app should always remain functional in all extreme
        screen sizes. Depending on the context, we may want to put additional effort
        into creating custom layouts optimized for particular screen sizes. For
        example, we should put additional effort into optimizing the mobile Learner
        experience, while for administrators this might not be as critical.
      </p>

      <p>
        When designing and building layouts, we use the breakpoints defined by
        Material Design. These are exposed in our app by the
        <code>responsiveWindow</code> Vue component mixin. We should never use CSS
        media queries.
      </p>

    </PageSection>
    <PageSection title="Keyboard navigation" anchor="#keyboard">

      <p>
        Every interaction that can be performed with a mouse or touchscreen should also
        be accessible by using the keyboard. As much as possible, we should follow best
        practices including:
      </p>

      <ul>
        <li>high-contrast focus indicators</li>
        <li>intuitive navigation tab order</li>
        <li>conventional keyboard shortcuts for common input widgets</li>
      </ul>

      <p>
        Using the built-in components outlined in this guide is a good way to ensure
        that your UI will be navigable by keyboard.
      </p>
    </PageSection>
    <PageSection title="Screen reader support" anchor="#screen-readers">

      <p>
        All content that can be read by sighted users should be readable by screen
        readers. Additionally, the app should leverage screen-reader-specific
        functionality – such as labels, semantically correct HTML tags, and
        visually-hidden text – that associates descriptive text with functionality.
      </p>

      <p>
        Like with keyboard navigation, using the built-in components is a good way to
        ensure compatibility with screen readers. However, it's also critical to test
        all new functionality. See this
        <ExternalLink href="https://github.com/learningequality/kolibri/wiki/Accessibility-Resources-(Tools)" text="comprehensive list of A11y testing tools" />.
      </p>

      <p>
        Some specific things to watch for:
      </p>

      <ul>
        <li>
          Use ARIA attributes when appropriate. (In general, this is <em>only</em>
          when using semantically correct HTML is not possible.)
        </li>
        <li>
          Nest header tags properly: <code>h1</code>, <code>h2</code>, <code>h3</code>, etc.
        </li>
        <li><code>alt</code> text on images</li>
      </ul>
    </PageSection>
    <PageSection title="Color and contrast" anchor="#color">

      <p>
        Contrast should be at least 3:1 for large text and 4.5:1 for smaller text.
        Colors should either be color-blindness-safe, or be redundant with a
        non-color-based representation of information.
      </p>


    </PageSection>
    <PageSection title="Internationalization" anchor="#color">

      <p>
        All user-facing text and iconography needs to be internationalized. For text
        strings, numbers, dates, and times, this means "wrapping" the messages such
        that they can be mapped to messages in other languages using the
        <ExternalLink href="https://formatjs.io/guides/message-syntax/" text="ICU message syntax" />.
        See our <ExternalLink href="https://kolibri-dev.readthedocs.io/en/develop/i18n.html" text="developer docs" />
        for more information.
      </p>

      <p>
        Icons and phrases that might not be globally understood should be avoided.
        Also, beware of using terms like 'left' and 'right' in RTL languages.
      </p>

      <p>
        The built-in components in this guide support right-to-left languages out of
        the box. If you design or build custom components, these need to be fully
        tested using an RTL language. We use a
        <ExternalLink href="https://www.npmjs.com/package/webpack-rtl-plugin" text="webpack plugin" />
        to automatically flip most of the CSS, and the global <code>isRtl</code>
        attribute on all Vue components can be used to customize behavior if
        necessary.
      </p>

      <p>
        A <ExternalLink href="https://material.io/guidelines/usability/bidirectionality.html#bidirectionality-rtl-mirroring-guidelines" text="subset of icons" /> need to be flipped in RTL languages.
      </p>

    </PageSection>
  </PageTemplate>

</template>


<script>

  import PageTemplate from '../common/PageTemplate';
  import PageSection from '../common/PageSection';
  import ExternalLink from '../common/ExternalLink';

  export default {
    name: 'Inclusive',
    components: {
      PageTemplate,
      PageSection,
      ExternalLink,
    },
  };

</script>


<style lang="scss" scoped></style>
