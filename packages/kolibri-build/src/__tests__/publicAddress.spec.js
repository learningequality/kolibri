const { publicAddress } = require('../publicAddress');

describe('publicAddress', function () {
  it('should advertise localhost and the bound port when neither option is set', function () {
    expect(publicAddress({ port: 3001 })).toEqual({ host: 'localhost', port: 3001 });
  });
  it('should advertise the public host and port independently of the bound port', function () {
    expect(publicAddress({ publicHost: 'kolibri.example', publicPort: 34567, port: 3000 })).toEqual(
      { host: 'kolibri.example', port: 34567 },
    );
  });
  it('should replace a wildcard public host with localhost', function () {
    for (const publicHost of ['0.0.0.0', '::', '[::]']) {
      expect(publicAddress({ publicHost, port: 3000 }).host).toEqual('localhost');
    }
  });
});
