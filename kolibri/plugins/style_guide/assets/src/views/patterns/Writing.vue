<template>

  <PageTemplate>

    <PageSection title="Overview" anchor="#overview">
      <p>
        In general, we follow <ExternalLink href="https://material.io/archive/guidelines/style/writing.html" text="Material Design's writing guidelines" />. Our slightly adapted version is below.
      </p>
    </PageSection>
    <PageSection title="Language &amp; tone" anchor="#language">


      <ul>
        <li>Address the user as 'you', and avoid using 'we'</li>
        <li>Use the <ExternalLink href="https://en.wikipedia.org/wiki/Singular_they" text="gender-neutral singular" /> 'they'</li>
        <li>Be concise</li>
        <li>Write in the present tense</li>
        <li>Write simply and directly</li>
        <li>Write for all levels of readers - do not use complex terminology</li>
        <li>Use consistent words in all parts of the app</li>
        <li>“1, 2, 3” not “one, two, three”</li>
        <li>Reveal detail as needed</li>
        <li>Be positive</li>
        <li>Communicate only essential details</li>
      </ul>

    </PageSection>
    <PageSection title="Punctuation" anchor="#punctuation">

      <ul>
        <li>Use sentence-style caps</li>
        <li>Skip periods and unnecessary punctuation</li>
        <li>Skip colons after labels</li>
        <li>Use contractions when they make a sentence easier to understand</li>
        <li>Avoid exclamation marks</li>
      </ul>

    </PageSection>
    <PageSection title="Additional notes" anchor="#notes">

      <p>These guidelines are specific to Kolibri and not in Material:</p>

      <ul>
        <li>
          Always wrap user-generated text in 'single quotes'. Do not try to add
          formatting such as bold or italics
        </li>
        <li>
          Avoid creating new Proper Nouns in casual messages. For example,
          "You are a coach", not "You are a Coach"
        </li>
      </ul>
    </PageSection>

  </PageTemplate>

</template>


<script>

  import PageTemplate from '../common/PageTemplate';
  import PageSection from '../common/PageSection';
  import ExternalLink from '../common/ExternalLink';

  export default {
    name: 'Writing',
    components: {
      PageTemplate,
      PageSection,
      ExternalLink,
    },
  };

</script>


<style lang="scss" scoped></style>
