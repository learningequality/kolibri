# coding: utf-8
from sqlalchemy import Boolean
from sqlalchemy import CHAR
from sqlalchemy import Column
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()
metadata = Base.metadata


class ContentChannelmetadata(Base):
    __tablename__ = "content_channelmetadata"

    id = Column(CHAR(32), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(String(400), nullable=False)
    author = Column(String(400), nullable=False)
    version = Column(Integer, nullable=False)
    thumbnail = Column(Text, nullable=False)
    root_pk = Column(CHAR(32), nullable=False)


class ContentContenttag(Base):
    __tablename__ = "content_contenttag"

    id = Column(CHAR(32), primary_key=True)
    tag_name = Column(String(30), nullable=False)


class ContentLanguage(Base):
    __tablename__ = "content_language"

    id = Column(String(14), primary_key=True)
    lang_code = Column(String(3), nullable=False, index=True)
    lang_subcode = Column(String(10), index=True)
    lang_name = Column(String(100))
    lang_direction = Column(String(3), nullable=False)


class ContentLicense(Base):
    __tablename__ = "content_license"

    id = Column(Integer, primary_key=True)
    license_name = Column(String(50), nullable=False)
    license_description = Column(String(400))


class ContentContentnode(Base):
    __tablename__ = "content_contentnode"

    id = Column(CHAR(32), primary_key=True)
    title = Column(String(200), nullable=False)
    content_id = Column(CHAR(32), nullable=False, index=True)
    description = Column(String(400))
    sort_order = Column(Float)
    license_owner = Column(String(200), nullable=False)
    author = Column(String(200), nullable=False)
    kind = Column(String(200), nullable=False)
    available = Column(Boolean, nullable=False)
    stemmed_metaphone = Column(String(1800), nullable=False)
    lft = Column(Integer, nullable=False, index=True)
    rght = Column(Integer, nullable=False, index=True)
    tree_id = Column(Integer, nullable=False, index=True)
    level = Column(Integer, nullable=False, index=True)
    lang_id = Column(ForeignKey("content_language.id"), index=True)
    license_id = Column(ForeignKey("content_license.id"), index=True)
    parent_id = Column(ForeignKey("content_contentnode.id"), index=True)

    lang = relationship("ContentLanguage")
    license = relationship("ContentLicense")
    parent = relationship("ContentContentnode", remote_side=[id])


class ContentAssessmentmetadata(Base):
    __tablename__ = "content_assessmentmetadata"

    id = Column(CHAR(32), primary_key=True)
    assessment_item_ids = Column(Text, nullable=False)
    number_of_assessments = Column(Integer, nullable=False)
    mastery_model = Column(Text, nullable=False)
    randomize = Column(Boolean, nullable=False)
    is_manipulable = Column(Boolean, nullable=False)
    contentnode_id = Column(ForeignKey("content_contentnode.id"), index=True)

    contentnode = relationship("ContentContentnode")


class ContentContentnodeHasPrerequisite(Base):
    __tablename__ = "content_contentnode_has_prerequisite"
    __table_args__ = (
        Index(
            "content_contentnode_has_prerequisite_from_contentnode_id_c9e1d527_uniq",
            "from_contentnode_id",
            "to_contentnode_id",
            unique=True,
        ),
    )

    id = Column(Integer, primary_key=True)
    from_contentnode_id = Column(
        ForeignKey("content_contentnode.id"), nullable=False, index=True
    )
    to_contentnode_id = Column(
        ForeignKey("content_contentnode.id"), nullable=False, index=True
    )

    from_contentnode = relationship(
        "ContentContentnode",
        primaryjoin="ContentContentnodeHasPrerequisite.from_contentnode_id == ContentContentnode.id",
    )
    to_contentnode = relationship(
        "ContentContentnode",
        primaryjoin="ContentContentnodeHasPrerequisite.to_contentnode_id == ContentContentnode.id",
    )


class ContentContentnodeRelated(Base):
    __tablename__ = "content_contentnode_related"
    __table_args__ = (
        Index(
            "content_contentnode_related_from_contentnode_id_fc2ed20c_uniq",
            "from_contentnode_id",
            "to_contentnode_id",
            unique=True,
        ),
    )

    id = Column(Integer, primary_key=True)
    from_contentnode_id = Column(
        ForeignKey("content_contentnode.id"), nullable=False, index=True
    )
    to_contentnode_id = Column(
        ForeignKey("content_contentnode.id"), nullable=False, index=True
    )

    from_contentnode = relationship(
        "ContentContentnode",
        primaryjoin="ContentContentnodeRelated.from_contentnode_id == ContentContentnode.id",
    )
    to_contentnode = relationship(
        "ContentContentnode",
        primaryjoin="ContentContentnodeRelated.to_contentnode_id == ContentContentnode.id",
    )


class ContentContentnodeTags(Base):
    __tablename__ = "content_contentnode_tags"
    __table_args__ = (
        Index(
            "content_contentnode_tags_contentnode_id_64a4ac15_uniq",
            "contentnode_id",
            "contenttag_id",
            unique=True,
        ),
    )

    id = Column(Integer, primary_key=True)
    contentnode_id = Column(
        ForeignKey("content_contentnode.id"), nullable=False, index=True
    )
    contenttag_id = Column(
        ForeignKey("content_contenttag.id"), nullable=False, index=True
    )

    contentnode = relationship("ContentContentnode")
    contenttag = relationship("ContentContenttag")


class ContentFile(Base):
    __tablename__ = "content_file"

    id = Column(CHAR(32), primary_key=True)
    checksum = Column(String(400), nullable=False)
    extension = Column(String(40), nullable=False)
    available = Column(Boolean, nullable=False)
    file_size = Column(Integer)
    preset = Column(String(150), nullable=False)
    supplementary = Column(Boolean, nullable=False)
    thumbnail = Column(Boolean, nullable=False)
    priority = Column(Integer)
    contentnode_id = Column(ForeignKey("content_contentnode.id"), index=True)
    lang_id = Column(ForeignKey("content_language.id"), index=True)

    contentnode = relationship("ContentContentnode")
    lang = relationship("ContentLanguage")
