<template>

  <!-- eslint-disable max-len -->
  <PageTemplate>

    <PageSection title="Overview" anchor="#overview">
      <p>
        During design and development, colors should be referenced by name. Using named colors has a few important benefits:
      </p>
      <ul>
        <li>More meaningful than hex values in mockups and code</li>
        <li>Encourages consistency and accessibility across the application</li>
        <li>Support for alternate themes</li>
      </ul>
      <p>
        Some examples of named colors in the Kolibri design system include:
      </p>
      <ColorBlock name="tokens.text" />
      <ColorBlock name="tokens.error" />
      <ColorBlock name="tokens.primary" />
      <ColorBlock name="brand.primary.v_900" />
      <ColorBlock name="brand.secondary.v_200" />
      <ColorBlock name="palette.grey.v_400" />

      <p>
        Care must be taken as we adjust the colors in the application. There are a number of considerations to take into account, including:
      </p>
      <ul>
        <li>Branding, aesthetics, and color harmony</li>
        <li>Sufficient contrast between foreground and background colors</li>
        <li>Accommodation of color blind users</li>
        <li>Maintainability and consistency of the application and code</li>
        <li>Amenability to theming by using tokens correctly</li>
      </ul>

    </PageSection>

    <PageSection title="Tokens" anchor="#tokens">
      <p>
        Color tokens are the most important set of named colors because they have a specific, well-defined usage within the application. Over time, our set of tokens should grow and shrink as necessary to fit the needs of the application.
      </p>
      <p>
        Color tokens are by themselves abstract and defined by a purpose, not a color value. A
        <router-link to="#theme">
          theme
        </router-link>
        makes them concrete by mapping them to specific
        <router-link to="#brand">
          brand colors
        </router-link>
        and
        <router-link to="#palette">
          palette colors
        </router-link>.
      </p>
      <p>
        When using tokens, it's very important to use them because of their purposes, not because of their color values. Multiple tokens will commonly share a single color value.
      </p>

      <h3>Brand shortcuts</h3>
      <ColorBlock name="tokens.primary" definition>
        Default primary brand color. Commonly used for interactive elements
      </ColorBlock>
      <ColorBlock name="tokens.primaryDark" definition>
        Default dark variant of the primary brand color. Commonly used for the hover state of interactive elements
      </ColorBlock>

      <h3>UI Colors</h3>
      <ColorBlock name="tokens.surface" definition>
        Default background color
      </ColorBlock>
      <ColorBlock name="tokens.text" definition>
        Normal text color. (Typically used on top of the <code>$themeTokens.surface</code> color)
      </ColorBlock>
      <ColorBlock name="tokens.annotation" definition>
        Text color with lower visual weight. (Typically used on top of the <code>$themeTokens.surface</code> color)
      </ColorBlock>
      <ColorBlock name="tokens.textDisabled" definition>
        Text color with lowest visual weight. (Typically used on top of the <code>$themeTokens.surface</code> color)
      </ColorBlock>
      <ColorBlock name="tokens.textInverted" definition>
        Text color for creating sufficient contrast when used on dark backgrounds (such as <code>$themeTokens.primary</code>)
      </ColorBlock>
      <ColorBlock name="tokens.loading" definition>
        Color for loaders, spinners, and other progress indicators
      </ColorBlock>
      <ColorBlock name="tokens.focusOutline" definition>
        Used to indicate keyboard focus
      </ColorBlock>
      <ColorBlock name="tokens.fineLine" definition>
        Used for divider lines and rules
      </ColorBlock>
      <ColorBlock name="tokens.error" definition>
        Indicates an application or validation error
      </ColorBlock>
      <ColorBlock name="tokens.success" definition>
        Indicates the successful completion of an action in the application
      </ColorBlock>

      <h3>Learner activity</h3>
      <ColorBlock name="tokens.progress" definition>
        Indicates "in-progress" learner activity
      </ColorBlock>
      <ColorBlock name="tokens.mastered" definition>
        Indicates learner mastery or completion
      </ColorBlock>
      <ColorBlock name="tokens.correct" definition>
        Indicates a correct response by a learner
      </ColorBlock>
      <ColorBlock name="tokens.incorrect" definition>
        Indicates an incorrect response by a learner
      </ColorBlock>

      <h3>User-related labels</h3>
      <ColorBlock name="tokens.coachContent" definition>
        Used for coloring coach content icons
      </ColorBlock>
      <ColorBlock name="tokens.superAdmin" definition>
        Used for coloring super admin permission key icons
      </ColorBlock>

      <h3>Content-related labels</h3>
      <ColorBlock name="tokens.exercise" definition />
      <ColorBlock name="tokens.video" definition />
      <ColorBlock name="tokens.audio" definition />
      <ColorBlock name="tokens.document" definition />
      <ColorBlock name="tokens.html5" definition />
      <ColorBlock name="tokens.topic" definition />

    </PageSection>

    <PageSection title="Scales" anchor="#scales">
      <p>
        A color scale – sometimes called a color ramp – is an evenly-spaced ramp of shades for a particular color hue. In Kolibri, we follow <ExternalLink text="Google's Material convention" href="https://material.io/archive/guidelines/style/color.html" /> and segment colors into ten brightness levels, named <code>v_50</code>, <code>v_100</code>, <code>v_20</code>, … <code>v_800</code>, <code>v_900</code>:
      </p>
      <ColorBlock name="palette.blue.v_50" />
      <ColorBlock name="palette.blue.v_100" />
      <ColorBlock name="palette.blue.v_200" />
      <p style="margin-left: 60px">
        …
      </p>
      <ColorBlock name="palette.blue.v_800" />
      <ColorBlock name="palette.blue.v_900" />
      <p>
        Due to the inconsistent way that humans perceive color and light, computing these scales is <ExternalLink text="both art and science" href="https://uxplanet.org/designing-systematic-colors-b5d2605b15c" />. It should not be done by simply sliding a "brightness" setting. We used <ExternalLink text="materialpalettes.com" href="https://materialpalettes.com/" /> to generate the scales for our primary and secondary brand colors. The same should be done for new themes.
      </p>
    </PageSection>

    <PageSection title="Brand colors" anchor="#brand">
      <p>
        Brand colors are chosen to reflect the mood, identity, or trademark of an application or an organization. The design system defines primary (dominant) and secondary (accent) branded color hues.
      </p>
      <p>
        Kolibri has what we call "Kolibri Purple" as its primary and "Kolibri Teal" as its secondary, available across the full brightness scale:
      </p>
      <table>
        <tr>
          <td>
            <ColorBlock name="brand.primary.v_50" definition />
            <ColorBlock name="brand.primary.v_100" definition />
            <ColorBlock name="brand.primary.v_200" definition />
            <ColorBlock name="brand.primary.v_300" definition />
            <ColorBlock name="brand.primary.v_400" definition />
            <ColorBlock name="brand.primary.v_500" definition />
            <ColorBlock name="brand.primary.v_600" definition />
            <ColorBlock name="brand.primary.v_700" definition />
            <ColorBlock name="brand.primary.v_800" definition />
            <ColorBlock name="brand.primary.v_900" definition />
          </td>
          <td>
            <ColorBlock name="brand.secondary.v_50" definition />
            <ColorBlock name="brand.secondary.v_100" definition />
            <ColorBlock name="brand.secondary.v_200" definition />
            <ColorBlock name="brand.secondary.v_300" definition />
            <ColorBlock name="brand.secondary.v_400" definition />
            <ColorBlock name="brand.secondary.v_500" definition />
            <ColorBlock name="brand.secondary.v_600" definition />
            <ColorBlock name="brand.secondary.v_700" definition />
            <ColorBlock name="brand.secondary.v_800" definition />
            <ColorBlock name="brand.secondary.v_900" definition />
          </td>
        </tr>
      </table>

    </PageSection>

    <PageSection title="Palette" anchor="#palette">
      <p>
        A color palette is a set of generic base colors that cover a wide range of the color spectrum. We use the <ExternalLink text="2014 Material Design color palette" href="https://material.io/archive/guidelines/style/color.html#color-color-tool" />, which has many colors to choose from.
      </p>
      <p>
        In our design system, colors from the palette have names like <code>pink</code>, <code>grey</code>, and <code>amber</code>.
      </p>
      <p>
        With the exception of grey values, choosing arbitrary colors from the palette is only slightly better than choosing arbitrary hex values from the full color spectrum. No consistency or meaning is ensured, and they should generally be avoided in favor of specific color tokens and brand colors.
      </p>

      <h3>Grey values</h3>
      <p>A scale of standard greys</p>
      <ColorBlock name="palette.white" definition />
      <ColorBlock name="palette.black" definition />
      <ColorBlock name="palette.grey.v_50" definition />
      <ColorBlock name="palette.grey.v_100" definition />
      <ColorBlock name="palette.grey.v_200" definition />
      <ColorBlock name="palette.grey.v_300" definition />
      <ColorBlock name="palette.grey.v_400" definition />
      <ColorBlock name="palette.grey.v_500" definition />
      <ColorBlock name="palette.grey.v_600" definition />
      <ColorBlock name="palette.grey.v_700" definition />
      <ColorBlock name="palette.grey.v_800" definition />
      <ColorBlock name="palette.grey.v_900" definition />


      <h3>Full palette</h3>
      <p>The complete set of colors available in the palette</p>
      <table>
        <tr>
          <td>
            <ColorBlock name="palette.bluegrey.v_50" definition />
            <ColorBlock name="palette.bluegrey.v_100" definition />
            <ColorBlock name="palette.bluegrey.v_200" definition />
            <ColorBlock name="palette.bluegrey.v_300" definition />
            <ColorBlock name="palette.bluegrey.v_400" definition />
            <ColorBlock name="palette.bluegrey.v_500" definition />
            <ColorBlock name="palette.bluegrey.v_600" definition />
            <ColorBlock name="palette.bluegrey.v_700" definition />
            <ColorBlock name="palette.bluegrey.v_800" definition />
            <ColorBlock name="palette.bluegrey.v_900" definition />
          </td>
          <td>
            <ColorBlock name="palette.red.v_50" definition />
            <ColorBlock name="palette.red.v_100" definition />
            <ColorBlock name="palette.red.v_200" definition />
            <ColorBlock name="palette.red.v_300" definition />
            <ColorBlock name="palette.red.v_400" definition />
            <ColorBlock name="palette.red.v_500" definition />
            <ColorBlock name="palette.red.v_600" definition />
            <ColorBlock name="palette.red.v_700" definition />
            <ColorBlock name="palette.red.v_800" definition />
            <ColorBlock name="palette.red.v_900" definition />
          </td>
        </tr>
        <tr>
          <td>
            <ColorBlock name="palette.pink.v_50" definition />
            <ColorBlock name="palette.pink.v_100" definition />
            <ColorBlock name="palette.pink.v_200" definition />
            <ColorBlock name="palette.pink.v_300" definition />
            <ColorBlock name="palette.pink.v_400" definition />
            <ColorBlock name="palette.pink.v_500" definition />
            <ColorBlock name="palette.pink.v_600" definition />
            <ColorBlock name="palette.pink.v_700" definition />
            <ColorBlock name="palette.pink.v_800" definition />
            <ColorBlock name="palette.pink.v_900" definition />
          </td>
          <td>
            <ColorBlock name="palette.purple.v_50" definition />
            <ColorBlock name="palette.purple.v_100" definition />
            <ColorBlock name="palette.purple.v_200" definition />
            <ColorBlock name="palette.purple.v_300" definition />
            <ColorBlock name="palette.purple.v_400" definition />
            <ColorBlock name="palette.purple.v_500" definition />
            <ColorBlock name="palette.purple.v_600" definition />
            <ColorBlock name="palette.purple.v_700" definition />
            <ColorBlock name="palette.purple.v_800" definition />
            <ColorBlock name="palette.purple.v_900" definition />
          </td>
        </tr>
        <tr>
          <td>
            <ColorBlock name="palette.deeppurple.v_50" definition />
            <ColorBlock name="palette.deeppurple.v_100" definition />
            <ColorBlock name="palette.deeppurple.v_200" definition />
            <ColorBlock name="palette.deeppurple.v_300" definition />
            <ColorBlock name="palette.deeppurple.v_400" definition />
            <ColorBlock name="palette.deeppurple.v_500" definition />
            <ColorBlock name="palette.deeppurple.v_600" definition />
            <ColorBlock name="palette.deeppurple.v_700" definition />
            <ColorBlock name="palette.deeppurple.v_800" definition />
            <ColorBlock name="palette.deeppurple.v_900" definition />
          </td>
          <td>
            <ColorBlock name="palette.indigo.v_50" definition />
            <ColorBlock name="palette.indigo.v_100" definition />
            <ColorBlock name="palette.indigo.v_200" definition />
            <ColorBlock name="palette.indigo.v_300" definition />
            <ColorBlock name="palette.indigo.v_400" definition />
            <ColorBlock name="palette.indigo.v_500" definition />
            <ColorBlock name="palette.indigo.v_600" definition />
            <ColorBlock name="palette.indigo.v_700" definition />
            <ColorBlock name="palette.indigo.v_800" definition />
            <ColorBlock name="palette.indigo.v_900" definition />
          </td>
        </tr>
        <tr>
          <td>
            <ColorBlock name="palette.blue.v_50" definition />
            <ColorBlock name="palette.blue.v_100" definition />
            <ColorBlock name="palette.blue.v_200" definition />
            <ColorBlock name="palette.blue.v_300" definition />
            <ColorBlock name="palette.blue.v_400" definition />
            <ColorBlock name="palette.blue.v_500" definition />
            <ColorBlock name="palette.blue.v_600" definition />
            <ColorBlock name="palette.blue.v_700" definition />
            <ColorBlock name="palette.blue.v_800" definition />
            <ColorBlock name="palette.blue.v_900" definition />
          </td>
          <td>
            <ColorBlock name="palette.lightblue.v_50" definition />
            <ColorBlock name="palette.lightblue.v_100" definition />
            <ColorBlock name="palette.lightblue.v_200" definition />
            <ColorBlock name="palette.lightblue.v_300" definition />
            <ColorBlock name="palette.lightblue.v_400" definition />
            <ColorBlock name="palette.lightblue.v_500" definition />
            <ColorBlock name="palette.lightblue.v_600" definition />
            <ColorBlock name="palette.lightblue.v_700" definition />
            <ColorBlock name="palette.lightblue.v_800" definition />
            <ColorBlock name="palette.lightblue.v_900" definition />
          </td>
        </tr>
        <tr>
          <td>
            <ColorBlock name="palette.cyan.v_50" definition />
            <ColorBlock name="palette.cyan.v_100" definition />
            <ColorBlock name="palette.cyan.v_200" definition />
            <ColorBlock name="palette.cyan.v_300" definition />
            <ColorBlock name="palette.cyan.v_400" definition />
            <ColorBlock name="palette.cyan.v_500" definition />
            <ColorBlock name="palette.cyan.v_600" definition />
            <ColorBlock name="palette.cyan.v_700" definition />
            <ColorBlock name="palette.cyan.v_800" definition />
            <ColorBlock name="palette.cyan.v_900" definition />
          </td>
          <td>
            <ColorBlock name="palette.teal.v_50" definition />
            <ColorBlock name="palette.teal.v_100" definition />
            <ColorBlock name="palette.teal.v_200" definition />
            <ColorBlock name="palette.teal.v_300" definition />
            <ColorBlock name="palette.teal.v_400" definition />
            <ColorBlock name="palette.teal.v_500" definition />
            <ColorBlock name="palette.teal.v_600" definition />
            <ColorBlock name="palette.teal.v_700" definition />
            <ColorBlock name="palette.teal.v_800" definition />
            <ColorBlock name="palette.teal.v_900" definition />
          </td>
        </tr>
        <tr>
          <td>
            <ColorBlock name="palette.green.v_50" definition />
            <ColorBlock name="palette.green.v_100" definition />
            <ColorBlock name="palette.green.v_200" definition />
            <ColorBlock name="palette.green.v_300" definition />
            <ColorBlock name="palette.green.v_400" definition />
            <ColorBlock name="palette.green.v_500" definition />
            <ColorBlock name="palette.green.v_600" definition />
            <ColorBlock name="palette.green.v_700" definition />
            <ColorBlock name="palette.green.v_800" definition />
            <ColorBlock name="palette.green.v_900" definition />
          </td>
          <td>
            <ColorBlock name="palette.lightgreen.v_50" definition />
            <ColorBlock name="palette.lightgreen.v_100" definition />
            <ColorBlock name="palette.lightgreen.v_200" definition />
            <ColorBlock name="palette.lightgreen.v_300" definition />
            <ColorBlock name="palette.lightgreen.v_400" definition />
            <ColorBlock name="palette.lightgreen.v_500" definition />
            <ColorBlock name="palette.lightgreen.v_600" definition />
            <ColorBlock name="palette.lightgreen.v_700" definition />
            <ColorBlock name="palette.lightgreen.v_800" definition />
            <ColorBlock name="palette.lightgreen.v_900" definition />
          </td>
        </tr>
        <tr>
          <td>
            <ColorBlock name="palette.lime.v_50" definition />
            <ColorBlock name="palette.lime.v_100" definition />
            <ColorBlock name="palette.lime.v_200" definition />
            <ColorBlock name="palette.lime.v_300" definition />
            <ColorBlock name="palette.lime.v_400" definition />
            <ColorBlock name="palette.lime.v_500" definition />
            <ColorBlock name="palette.lime.v_600" definition />
            <ColorBlock name="palette.lime.v_700" definition />
            <ColorBlock name="palette.lime.v_800" definition />
            <ColorBlock name="palette.lime.v_900" definition />
          </td>
          <td>
            <ColorBlock name="palette.yellow.v_50" definition />
            <ColorBlock name="palette.yellow.v_100" definition />
            <ColorBlock name="palette.yellow.v_200" definition />
            <ColorBlock name="palette.yellow.v_300" definition />
            <ColorBlock name="palette.yellow.v_400" definition />
            <ColorBlock name="palette.yellow.v_500" definition />
            <ColorBlock name="palette.yellow.v_600" definition />
            <ColorBlock name="palette.yellow.v_700" definition />
            <ColorBlock name="palette.yellow.v_800" definition />
            <ColorBlock name="palette.yellow.v_900" definition />
          </td>
        </tr>
        <tr>
          <td>
            <ColorBlock name="palette.amber.v_50" definition />
            <ColorBlock name="palette.amber.v_100" definition />
            <ColorBlock name="palette.amber.v_200" definition />
            <ColorBlock name="palette.amber.v_300" definition />
            <ColorBlock name="palette.amber.v_400" definition />
            <ColorBlock name="palette.amber.v_500" definition />
            <ColorBlock name="palette.amber.v_600" definition />
            <ColorBlock name="palette.amber.v_700" definition />
            <ColorBlock name="palette.amber.v_800" definition />
            <ColorBlock name="palette.amber.v_900" definition />
          </td>
          <td>
            <ColorBlock name="palette.orange.v_50" definition />
            <ColorBlock name="palette.orange.v_100" definition />
            <ColorBlock name="palette.orange.v_200" definition />
            <ColorBlock name="palette.orange.v_300" definition />
            <ColorBlock name="palette.orange.v_400" definition />
            <ColorBlock name="palette.orange.v_500" definition />
            <ColorBlock name="palette.orange.v_600" definition />
            <ColorBlock name="palette.orange.v_700" definition />
            <ColorBlock name="palette.orange.v_800" definition />
            <ColorBlock name="palette.orange.v_900" definition />
          </td>
        </tr>
        <tr>
          <td>
            <ColorBlock name="palette.deeporange.v_50" definition />
            <ColorBlock name="palette.deeporange.v_100" definition />
            <ColorBlock name="palette.deeporange.v_200" definition />
            <ColorBlock name="palette.deeporange.v_300" definition />
            <ColorBlock name="palette.deeporange.v_400" definition />
            <ColorBlock name="palette.deeporange.v_500" definition />
            <ColorBlock name="palette.deeporange.v_600" definition />
            <ColorBlock name="palette.deeporange.v_700" definition />
            <ColorBlock name="palette.deeporange.v_800" definition />
            <ColorBlock name="palette.deeporange.v_900" definition />
          </td>
          <td>
            <ColorBlock name="palette.brown.v_50" definition />
            <ColorBlock name="palette.brown.v_100" definition />
            <ColorBlock name="palette.brown.v_200" definition />
            <ColorBlock name="palette.brown.v_300" definition />
            <ColorBlock name="palette.brown.v_400" definition />
            <ColorBlock name="palette.brown.v_500" definition />
            <ColorBlock name="palette.brown.v_600" definition />
            <ColorBlock name="palette.brown.v_700" definition />
            <ColorBlock name="palette.brown.v_800" definition />
            <ColorBlock name="palette.brown.v_900" definition />
          </td>
        </tr>
      </table>
    </PageSection>

    <PageSection title="Themes" anchor="#themes">
      <p>
        Kolibri comes with a default theme built in, which defines every brightness value of the primary and secondary brand colors. Additionally, the Kolibri application has a default mapping which assigns concrete values to all tokens. For example, by default we set <code>$themeTokens.error</code> to be equal to <code>$themePalette.red.v_700</code>
      </p>
      <p>
        When setting new brand colors:
      </p>
      <ol>
        <li>
          Generate new scales from base colors using <ExternalLink text="materialpalettes.com" href="https://materialpalettes.com/" />
        </li>
        <li>
          Redefine the values for <code>$themeTokens.primary</code> and <code>$themeTokens.primaryDark</code> to ensure that color contrast with <code>$themeTokens.textInverted</code> is sufficient.
        </li>
      </ol>

    </PageSection>

  </PageTemplate>
  <!-- eslint-enable max-len -->

</template>


<script>

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import PageTemplate from '../../shell/PageTemplate';
  import PageSection from '../../shell/PageTemplate/PageSection';
  import ExternalLink from '../../shell/ExternalLink';
  import ColorBlock from './ColorBlock';

  export default {
    name: 'Colors',
    components: {
      PageTemplate,
      PageSection,
      ExternalLink,
      ColorBlock,
    },
    mixins: [themeMixin],
  };

</script>


<style lang="scss" scoped>

  table {
    width: 100%;
  }

</style>
