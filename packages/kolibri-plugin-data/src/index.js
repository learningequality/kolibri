const template = document.querySelector(`template[data-plugin="${__kolibriModuleName}"]`);

const data = template ? JSON.parse(template.innerHTML.trim()) : {};

export default data;
