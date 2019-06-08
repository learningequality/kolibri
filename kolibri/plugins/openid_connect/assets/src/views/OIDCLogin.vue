<template>

  <button>Probando</button>

</template>


<script>

  import loginComponents from 'kolibri.utils.loginComponents';

  const component = {
    name: 'OIDCButton',
    components: {},
    $trs: {
      login: 'Login',
    },
  };

  loginComponents.register(component);

  export default component;

</script>
