/* eslint-env jest */

class JestMockResource {
  constructor() {
    this.getCollection = jest.fn();
    this.getModel = jest.fn();
    this.__resetMocks = this.__resetMocks.bind(this);
    this.__getCollectionFetchReturns = this.__getCollectionFetchReturns.bind(this);
    this.__getModelFetchReturns = this.__getModelFetchReturns.bind(this);
  }

  __resetMocks() {
    this.getCollection.mockReset();
    this.getModel.mockReset();
  }

  __getFetchable(payload, willReject = false) {
    const fetchable = {};
    if (willReject) {
      fetchable.fetch = () => Promise.reject(payload);
    } else {
      fetchable.fetch = () => Promise.resolve(payload);
    }
    jest.spyOn(fetchable, 'fetch');
    return fetchable;
  }

  __getSavable(payload, saveStub, willReject = false) {
    const saveable = {};
    if (willReject) {
      saveable.save = saveStub.mockRejectedValue(payload);
    } else {
      saveable.save = saveStub.mockResolvedValue(payload);
    }
    return saveable;
  }

  __getModelFetchReturns(payload, willReject = false) {
    const fetchable = this.__getFetchable(payload, willReject);
    this.getModel.mockReturnValue(fetchable);
    return fetchable;
  }

  __getModelSaveReturns(payload, willReject = false) {
    const saveStub = jest.fn();
    this.getModel.mockReturnValue(this.__getSavable(payload, saveStub, willReject));
    return saveStub;
  }

  __getCollectionFetchReturns(payload, willReject = false) {
    const fetchable = this.__getFetchable(payload, willReject);
    this.getCollection.mockReturnValue(fetchable);
    return fetchable;
  }
}

const methods = [
  'getCollection',
  'getModel',
  '__resetMocks',
  '__getCollectionFetchReturns',
  '__getModelFetchReturns',
  '__getFetchable',
  '__getSavable',
  '__getModelSaveReturns',
];

export function jestMockResource(Resource) {
  const mock = new JestMockResource();
  methods.forEach(method => {
    Resource[method] = mock[method];
  });
  return Resource;
}
