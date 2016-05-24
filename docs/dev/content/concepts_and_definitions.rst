Concepts and Definitions
========================

ContentNode
-----------

High level abstraction for prepresenting different content kinds, such as Topic, Video, Audio, Exercise, Document, and can be easily extended to support more content kinds by defining new `kind` field. Currently we use Django choices to define the kind field, and all content kinds are stored at ``kolibri/content/constants/content_kinds.py`` as constants.
ContentNode has a Foreign Key called `parent` that points to itself to form a tree structure. It also has other relationships, please see the database diagram shown below.

File
----

A Django model that is used to store details about the raw content file, such as what language it supports, how big is the size and which format the file is.

Each File object has a foreign key points to a ContentNode object, and is used to store the details about the content or part of the content. The field `ch

ContentDB Diagram
-----------------
.. image:: ../img/content_distributed_db.png
.. Source: https://www.draw.io/#G0B5xDzmtBJIQlNlEybldiODJqUHM

**PK = Primary Key
**FK = Foreign Key
**M2M = ManyToManyField

License
-------

A Django model that is associated with the ContentNode object to show what license the content is using.

PrerequisiteContentRelationship
-------------------------------

This model is used to establish an asymmetrical relationship between two ContentNode objects.

RelatedContentRelationship
--------------------------

This model is used to establish a symmetrical relationship between two ContentNode objects.

ContentTag
----------

This model is used to establish a filtering system for all ContentNode objects.

Lang
----

A Django model that is associated with the File object to show what language it supports.

ChannelMetadata
---------------

A Django model in its own database, `channeldb.sqlite`, stores all the database names for each channel, also including some metadata such as description, author, and human readable name. 

AbstractContent
---------------

All models in the Content app inherit from AbstractContent, an abstract Django Model class with custom model Manager that enables query on different database based on the database name. Because in Kolibri, each channel has its own database that stores its own set of content models. To query a sepcific channel, you can do something like ``ContentNode.objects.using(<your_database_name>).all()``
