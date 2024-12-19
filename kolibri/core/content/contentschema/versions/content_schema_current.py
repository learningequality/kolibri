# coding: utf-8
from sqlalchemy import BigInteger
from sqlalchemy import Boolean
from sqlalchemy import CHAR
from sqlalchemy import Column
from sqlalchemy import Float
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
metadata = Base.metadata


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


class ContentLocalfile(Base):
    __tablename__ = "content_localfile"

    id = Column(String(32), primary_key=True)
    available = Column(Boolean, nullable=False)
    file_size = Column(Integer)
    extension = Column(String(40), nullable=False)


class ContentContentnode(Base):
    __tablename__ = "content_contentnode"
    __table_args__ = (
        Index(
            "content_contentnode_level_channel_id_kind_fd732cc4_idx",
            "level",
            "channel_id",
            "kind",
        ),
        Index(
            "content_contentnode_level_channel_id_available_29f0bb18_idx",
            "level",
            "channel_id",
            "available",
        ),
    )

    id = Column(CHAR(32), primary_key=True)
    title = Column(String(200), nullable=False)
    content_id = Column(CHAR(32), nullable=False, index=True)
    channel_id = Column(CHAR(32), nullable=False, index=True)
    description = Column(Text)
    sort_order = Column(Float)
    license_owner = Column(String(200), nullable=False)
    author = Column(String(200), nullable=False)
    kind = Column(String(200), nullable=False)
    available = Column(Boolean, nullable=False)
    lft = Column(Integer, nullable=False)
    rght = Column(Integer, nullable=False)
    tree_id = Column(Integer, nullable=False, index=True)
    level = Column(Integer, nullable=False)
    lang_id = Column(String(14), index=True)
    license_description = Column(Text)
    license_name = Column(String(50))
    coach_content = Column(Boolean, nullable=False)
    num_coach_contents = Column(Integer)
    on_device_resources = Column(Integer)
    options = Column(Text)
    accessibility_labels = Column(Text)
    categories = Column(Text)
    duration = Column(Integer)
    grade_levels = Column(Text)
    learner_needs = Column(Text)
    learning_activities = Column(Text)
    resource_types = Column(Text)
    accessibility_labels_bitmask_0 = Column(BigInteger)
    categories_bitmask_0 = Column(BigInteger)
    grade_levels_bitmask_0 = Column(BigInteger)
    learner_needs_bitmask_0 = Column(BigInteger)
    learning_activities_bitmask_0 = Column(BigInteger)
    ancestors = Column(Text)
    admin_imported = Column(Boolean)
    parent_id = Column(CHAR(32), index=True)


class ContentAssessmentmetadata(Base):
    __tablename__ = "content_assessmentmetadata"

    id = Column(CHAR(32), primary_key=True)
    assessment_item_ids = Column(Text, nullable=False)
    number_of_assessments = Column(Integer, nullable=False)
    mastery_model = Column(Text, nullable=False)
    randomize = Column(Boolean, nullable=False)
    is_manipulable = Column(Boolean, nullable=False)
    contentnode_id = Column(CHAR(32), nullable=False, index=True)


class ContentChannelmetadata(Base):
    __tablename__ = "content_channelmetadata"

    id = Column(CHAR(32), primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(String(400), nullable=False)
    author = Column(String(400), nullable=False)
    version = Column(Integer, nullable=False)
    thumbnail = Column(Text, nullable=False)
    last_updated = Column(String)
    min_schema_version = Column(String(50), nullable=False)
    root_id = Column(CHAR(32), nullable=False, index=True)
    published_size = Column(BigInteger)
    total_resource_count = Column(Integer)
    order = Column(Integer)
    public = Column(Boolean)
    tagline = Column(String(150))
    partial = Column(Boolean)
    included_categories = Column(Text)
    included_grade_levels = Column(Text)


class ContentContentnodeHasPrerequisite(Base):
    __tablename__ = "content_contentnode_has_prerequisite"
    __table_args__ = (
        Index(
            "content_contentnode_has_prerequisite_from_contentnode_id_to_contentnode_id_c9e1d527_uniq",
            "from_contentnode_id",
            "to_contentnode_id",
            unique=True,
        ),
    )

    id = Column(Integer, primary_key=True)
    from_contentnode_id = Column(CHAR(32), nullable=False, index=True)
    to_contentnode_id = Column(CHAR(32), nullable=False, index=True)


class ContentContentnodeIncludedLanguages(Base):
    __tablename__ = "content_contentnode_included_languages"
    __table_args__ = (
        Index(
            "content_contentnode_included_languages_contentnode_id_language_id_7d14ec8b_uniq",
            "contentnode_id",
            "language_id",
            unique=True,
        ),
    )

    id = Column(Integer, primary_key=True)
    contentnode_id = Column(CHAR(32), nullable=False, index=True)
    language_id = Column(String(14), nullable=False, index=True)


class ContentContentnodeRelated(Base):
    __tablename__ = "content_contentnode_related"
    __table_args__ = (
        Index(
            "content_contentnode_related_from_contentnode_id_to_contentnode_id_fc2ed20c_uniq",
            "from_contentnode_id",
            "to_contentnode_id",
            unique=True,
        ),
    )

    id = Column(Integer, primary_key=True)
    from_contentnode_id = Column(CHAR(32), nullable=False, index=True)
    to_contentnode_id = Column(CHAR(32), nullable=False, index=True)


class ContentContentnodeTags(Base):
    __tablename__ = "content_contentnode_tags"
    __table_args__ = (
        Index(
            "content_contentnode_tags_contentnode_id_contenttag_id_64a4ac15_uniq",
            "contentnode_id",
            "contenttag_id",
            unique=True,
        ),
    )

    id = Column(Integer, primary_key=True)
    contentnode_id = Column(CHAR(32), nullable=False, index=True)
    contenttag_id = Column(CHAR(32), nullable=False, index=True)


class ContentFile(Base):
    __tablename__ = "content_file"

    id = Column(CHAR(32), primary_key=True)
    supplementary = Column(Boolean, nullable=False)
    thumbnail = Column(Boolean, nullable=False)
    priority = Column(Integer, index=True)
    contentnode_id = Column(CHAR(32), nullable=False, index=True)
    lang_id = Column(String(14), index=True)
    local_file_id = Column(String(32), nullable=False, index=True)
    preset = Column(String(150), nullable=False)


class ContentChannelmetadataIncludedLanguages(Base):
    __tablename__ = "content_channelmetadata_included_languages"
    __table_args__ = (
        Index(
            "content_channelmetadata_included_languages_channelmetadata_id_language_id_51f20415_uniq",
            "channelmetadata_id",
            "language_id",
            unique=True,
        ),
    )

    id = Column(Integer, primary_key=True)
    sort_value = Column(Integer, nullable=False)
    channelmetadata_id = Column(CHAR(32), nullable=False, index=True)
    language_id = Column(String(14), nullable=False, index=True)
