<template>

  <a
    href="/oidcauthenticate/"
    class="button secondary raised"
  >
    <file-svg
      slot="icon"
      src="./openid.svg"
    />
    {{ $tr('signInWithOpenIDConnect') }}
  </a>

</template>


<script>

  import loginComponents from 'kolibri.utils.loginComponents';

  const component = {
    name: 'OIDCPlugin',
    components: {},
    $trs: {
      login: 'Login',
      signInWithOpenIDConnect: 'Sign in with OpenID Connect',
    },
  };
  loginComponents.register(component);

  export default component;

</script>
