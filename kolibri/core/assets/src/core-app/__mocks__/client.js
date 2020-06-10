let returnedPayload = {};

const client = () => Promise.resolve({ data: returnedPayload });

client.__setPayload = payload => {
  returnedPayload = payload;
};

client.__reset = () => {
  returnedPayload = {};
};

export default client;
