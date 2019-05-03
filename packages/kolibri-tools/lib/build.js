function getEnvVar(variable) {
  try {
    return JSON.parse(process.env[variable]);
  } catch (e) {
    return process.env[variable];
  }
}

function getEnvVars() {
  return {
    data: getEnvVar('data'),
    index: getEnvVar('index'),
    options: getEnvVar('options'),
    start: getEnvVar('start'),
  };
}

module.exports = {
  getEnvVars,
};
