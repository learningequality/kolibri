let returnedPayload = {};

const client = jest.fn().mockResolvedValue({ data: returnedPayload });

client.__setPayload = payload => {
  returnedPayload = payload;
};

client.__reset = () => {
  returnedPayload = {};
};

export default client;
