Concepts and Definitions
========================

ContentNode
-----------

High level abstraction for prepresenting different content kinds, such as Topic, Video, Audio, Exercise, Document, and can be easily extended to support new content kinds. With multiple ContentNode objects, it supports grouping, arranging them in tree structure, and symmetric and asymmetric relationship between two ContentNode objects.

File
----

A Django model that is used to store details about the source file, such as what language it supports, how big is the size, which format the file is and where to find the source file.

ContentDB Diagram
-----------------
.. image:: ../img/content_distributed_db.png
.. Source: https://www.draw.io/#G0B5xDzmtBJIQlNlEybldiODJqUHM

**PK = Primary Key
**FK = Foreign Key
**M2M = ManyToManyField

License
-------

A Django model that is a foreign key in ContentNode model to show what license the content is using.

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

A Django model that is a foreign key in File model to show what language it supports.

ChannelMetadata
---------------

A Django model in its own database, `channeldb.sqlite`, stores all the database names for each channel, also including some metadata such as description, author, and human readable name. 

AbstractContent
---------------

In Kolibri, each channel has its own database. To support dynamic channel switching, all models in the Content app inherit from AbstractContent, an abstract Django Model class with custom model Manager that enables query on different database based on the database name.
