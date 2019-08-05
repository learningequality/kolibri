<template>

  <PageTemplate>

    <PageSection title="A shared vocabulary" anchor="#vocabulary">
      <p>
        This guide is meant to provide patterns and components that
        provide a 'default' way to design and build new functionality in
        Kolibri. Diligently using the patterns and components in this
        guide has a number of benefits, including:
      </p>
      <ul>
        <li>reduced time to design and build new functionality</li>
        <li>a consistent, learnable end-user experience</li>
        <li>accessibility by default</li>
      </ul>
      <p>
        As a matter of practice, we should by default <em>always</em>
        follow the guide. Therefore, it's best to keep the guidance
        in here as minimal as possible to give ourselves the flexibility
        to deal with unexpected situations.
      </p>
    </PageSection>
    <PageSection title="Exceptions to the rules" anchor="#exceptions">
      <p>
        Violating the style guide comes with some costs:
      </p>
      <ul>
        <li>increased effort in both design and development</li>
        <li>reduced consistency in the end-user experience</li>
        <li>reduced maintainability of the code base</li>
      </ul>
      <p>
        That said, there <em>will</em> be cases where we choose to use an
        alternate pattern or component than what is suggested by the
        guide in order to improve the user experience, and this is OK.
        Deviations from the guide should be intentional and explicit.
      </p>
    </PageSection>
    <PageSection title="Changes to the guide" anchor="#changes">
      <p>
        This is intended to be a <em>living</em> style guide. The guide should match
        the <em>current state</em> of Kolibri, not what we aspire it to be.
      </p>
      <p>
        If we notice that we are often deviating from some guidance, or that the guide
        does not handle a common pattern, we should update the patterns or components
        in the guide and the application simultaneously. In general, consistency is
        preferred over piece-meal improvements.
      </p>
    </PageSection>

  </PageTemplate>

</template>


<script>

  import PageTemplate from './common/PageTemplate';
  import PageSection from './common/PageSection';

  export default {
    name: 'Home',
    components: {
      PageTemplate,
      PageSection,
    },
  };

</script>


<style lang="scss" scoped></style>
