let returnedPayload = {};

const client = jest.fn().mockResolvedValue({ data: returnedPayload });

client.__setPayload = payload => {
  returnedPayload = payload;
  client.mockReset();
  client.mockResolvedValue({ data: returnedPayload });
};

client.__reset = () => {
  returnedPayload = {};
  client.mockReset();
  client.mockResolvedValue({ data: returnedPayload });
};

export default client;
