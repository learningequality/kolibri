<template>

  <page-template :completed="true">
    <h1>Kolibri Style Guide</h1>
    <h2>A shared vocabulary for developers and designers</h2>
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
      follow the guide.
    </p>
    <h2>Exceptions to the rules</h2>
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
    <p>
      If we notice that we are often deviating, or the guide does not
      handle a common pattern, we should update the patterns or
      components in the guide. These changes should be done
      holistically, changing the guide and the affected parts of the
      application in one pull request.
    </p>

  </page-template>

</template>


<script>

  import pageTemplate from '../shell/page-template';

  export default {
    components: {
      pageTemplate,
    },
  };

</script>


<style lang="stylus" scoped></style>
