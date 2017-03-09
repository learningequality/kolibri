
Server-Client Communication
===========================

Server API
----------

The server stores data that is used by Kolibri as Django Models. These models are then exposed through a REST API using Django REST framework. The models are defined inside a `models.py` file inside one of the Django apps that makes up the Kolibri project.

In the `api.py` file, Django REST framework ViewSets are defined which describe how the data is made available through the REST API. Each ViewSet also requires a defined Serializer, which describes the way in which the data from the Django model is serialized into JSON and returned through the REST API. Additionally, optional filters can be applied to the ViewSet which will allow queries to filter by particular features of the data (for example by a field) or by more complex constraints, such as which group the user associated with the data belongs to. Permissions can be applied to a ViewSet, allowing the API to implicitly restrict the data that is returned, based on the currently logged in user.

Finally, in the `api_urls.py` file, the viewsets are given a name, which sets a particular URL namespace, which is then registered and exposed when the Django server runs. Sometimes, a more complex URL scheme is used, as in the content core app, where every query is required to be prefixed by a channel id::

  router = routers.SimpleRouter()
  router.register('content', ChannelMetadataCacheViewSet, base_name="channel")

  content_router = routers.SimpleRouter()
  content_router.register(r'contentnode', ContentNodeViewset, base_name='contentnode')
  content_router.register(r'file', FileViewset, base_name='file')

  urlpatterns = [
      url(r'^', include(router.urls)),
      url(r'^content/(?P<channel_id>[^/.]+)/', include(content_router.urls)),
  ]


Client Resource Layer
---------------------

To access this REST API in the frontend Javascript code, an abstraction layer has been written to reduce the complexity of inferring URLs, caching resources, and saving data back to the server.

Resources
~~~~~~~~~

In order to access a particular REST API endpoint, a Javascript Resource has to be defined, an example is shown here::

  const Resource = require('kolibri.lib.apiResource').Resource;

  class ChannelResource extends Resource {
    static resourceName() {
      return 'channel';
    }
  }

  module.exports = ChannelResource;

Here, the value returned by the static `resourceName` method correlates directly with the name assigned to the endpoint in the `api_urls.py`. However, in the case of a more complex endpoint, where arguments are required to form the URL itself (such as in the content endpoints above) - we can add additional required arguments with the `resourceIdentifiers` static method return value::

  const Resource = require('kolibri.lib.apiResource').Resource;

  class ContentNodeResource extends Resource {
    static resourceName() {
      return 'contentnode';
    }
    static idKey() {
      return 'pk';
    }
    static resourceIdentifiers() {
      return [
        'channel_id',
      ];
    }
  }

  module.exports = ContentNodeResource;

If this resource is part of the core app, it can be added to a global registry of resources inside `kolibri/core/assets/src/api-resources/index.js`. Otherwise, it can be instantiated as needed, such as in the coach reports module::

  const ContentSummaryResourceConstructor = require('./apiResources/contentSummary');

  const ContentSummaryResource = new ContentSummaryResourceConstructor(coreApp);

First the constructor is imported from the require file, and then an instance is created - with a reference to the Kolibri core app module passed as the only argument.

Models
~~~~~~

The instantiated Resource can then be queried for client side representations of particular information. For a representation of a single server side Django model, we can request a Model from the Resource, using `getModel`::

  const contentModel = ContentNodeResource.getModel(id, { channel_id: channelId });

The first argument is the database id (primary key) for the model, while the second argument defines any additional required `resourceIdentifiers` that we need to build up the URL.

We now have a reference for a representation of the data on the server. To ensure that it has data from the server, we can call `fetch` on it which will resolve to an object representing the data::

  contentModel.fetch().then((data) => {
    logging.info('This is the model data: ', data);
  });

The `fetch` method returns a `Promise` which resolves when the data has been successfully retrieved. This may have been due to a round trip call to the REST API, or, if the data has already been previously returned, then it will skip the call to the REST API and return a cached copy of the data.

If you want to pass additional GET parameters to the REST API (to only return a limited set of fields, for example), then you can pass GET parameters in the first argument::

  contentModel.fetch({ title: true }).then((data) => {
    logging.info('This is the model data: ', data);
  });

If it is important to get data that has not been cached, you can call the `fetch` method with a force parameter::

  contentModel.fetch({}, true).then((data) => {
    logging.info('This is definitely the most up to date model data: ', data);
  });

Collections
~~~~~~~~~~~

For particular views on a data table (which could range from 'show me everything' to 'show me all content nodes with titles starting with "p"') - Collections are used. Collections are a cached view onto the data table, which are populated by Models - so if a Model that has previously been fetched from the server by a Collection is requested from `getModel`, it is already cachced.

  const contentCollection = ContentNodeResource.getCollection({ channel_id: channelId }, { popular: 1 });

The first argument defines any additional required `resourceIdentifiers` that we need to build up the URL, while the second argument defines the GET parameters that are used to define the filters to be applied to the data and hence the subset of the data that the Collection represents.

We now have a reference for a representation of this data on the server. To ensure that it has data from the server, we can call `fetch` on it, this will resolve to an array of the returned data objects::

  contentCollection.fetch().then((dataArray) => {
    logging.info('This is the model data: ', dataArray);
  });

The `fetch` method returns a `Promise` which resolves when the data has been successfully retrieved. This may have been due to a round trip call to the REST API, or, if the data has already been previously returned, then it will skip the call to the REST API and return a cached copy of the data.

If you want to pass additional GET parameters to the REST API (to only return a limited set of fields, for example), then you can pass GET parameters in the first argument::

  contentCollection.fetch({ title: true }).then((dataArray) => {
    logging.info('This is the model data: ', dataArray);
  });

If it is important to get data that has not been cached, you can call the `fetch` method with a force parameter::

  contentCollection.fetch({}, true).then((dataArray) => {
    logging.info('This is the model data: ', dataArray);
  });

Data Flow Diagram
-----------------

.. image:: ../img/full_stack_data_flow.svg
.. Source: https://docs.google.com/drawings/d/1TLMV8FWgh4KUIL1CRQ-C5S3J3efCbG7-dkCOLzjohj4/edit
