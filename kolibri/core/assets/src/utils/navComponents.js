const navComponents = [];

navComponents.register = component => {
  if (!navComponents.includes(component)) {
    navComponents.push(component);
  }
};

export default navComponents;

const sections = {
  ACCOUNT: 'account',
};

export { sections };
