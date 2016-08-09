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

ContentTag
----------

This model is used to establish a filtering system for all ContentNode objects.


ChannelMetadata
---------------

A Django model in each content database that stores the database readable names, description and author for each channel. 

ChannelMetadataCache
--------------------
This class stores the channel metadata cached/denormed into the default database.
