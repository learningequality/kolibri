Concepts and Definitions
========================

ContentNode
-----------

High level abstraction for prepresenting different content kinds, such as Topic, Video, Audio, Exercise, Document, and can be easily extended to support new content kinds. With multiple ContentNode objects, it supports grouping, arranging them in tree structure, and symmetric and asymmetric relationship between two ContentNode objects.

File
----

Model that stores details about a source file such the language, size, format, and location.

ContentDB diagram
-----------------
.. image:: ./content_distributed_db.png
.. Source: https://www.draw.io/#G0B5xDzmtBJIQlNlEybldiODJqUHM

* PK = Primary Key
* FK = Foreign Key
* M2M = ManyToManyField

ContentTag
----------

This model is used to establish a filtering system for all ContentNode objects.


ChannelMetadata
---------------

Model in each content database that stores the database readable names, description and author for each channel.

ChannelMetadataCache
--------------------
This class stores the channel metadata cached/denormed into the default database.
