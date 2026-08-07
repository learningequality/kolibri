CREATE TABLE content_contenttag (
	id CHAR(32) NOT NULL,
	tag_name VARCHAR(30) NOT NULL,
	PRIMARY KEY (id)
);
CREATE TABLE content_language (
	id VARCHAR(14) NOT NULL,
	lang_code VARCHAR(3) NOT NULL,
	lang_subcode VARCHAR(10),
	lang_name VARCHAR(100),
	lang_direction VARCHAR(3) NOT NULL,
	PRIMARY KEY (id)
);
CREATE INDEX ix_content_language_lang_code ON content_language (lang_code);
CREATE INDEX ix_content_language_lang_subcode ON content_language (lang_subcode);
CREATE TABLE content_localfile (
	id VARCHAR(32) NOT NULL,
	extension VARCHAR(40) NOT NULL,
	available BOOLEAN NOT NULL,
	file_size_bigint BIGINT,
	PRIMARY KEY (id)
);
CREATE TABLE content_contentnode (
	id CHAR(32) NOT NULL,
	license_name VARCHAR(50),
	license_description TEXT,
	title VARCHAR(200) NOT NULL,
	coach_content BOOLEAN NOT NULL,
	content_id CHAR(32) NOT NULL,
	channel_id CHAR(32) NOT NULL,
	description TEXT,
	sort_order FLOAT,
	license_owner VARCHAR(200) NOT NULL,
	author VARCHAR(200) NOT NULL,
	kind VARCHAR(200) NOT NULL,
	available BOOLEAN NOT NULL,
	options TEXT,
	grade_levels TEXT,
	resource_types TEXT,
	learning_activities TEXT,
	accessibility_labels TEXT,
	categories TEXT,
	learner_needs TEXT,
	duration INTEGER,
	lft INTEGER NOT NULL,
	rght INTEGER NOT NULL,
	tree_id INTEGER NOT NULL,
	level INTEGER NOT NULL,
	lang_id VARCHAR(14),
	parent_id CHAR(32),
	PRIMARY KEY (id),
	FOREIGN KEY(lang_id) REFERENCES content_language (id),
	FOREIGN KEY(parent_id) REFERENCES content_contentnode (id)
);
CREATE INDEX ix_content_contentnode_channel_id ON content_contentnode (channel_id);
CREATE INDEX ix_content_contentnode_content_id ON content_contentnode (content_id);
CREATE INDEX ix_content_contentnode_lang_id ON content_contentnode (lang_id);
CREATE INDEX ix_content_contentnode_level ON content_contentnode (level);
CREATE INDEX ix_content_contentnode_lft ON content_contentnode (lft);
CREATE INDEX ix_content_contentnode_parent_id ON content_contentnode (parent_id);
CREATE INDEX ix_content_contentnode_rght ON content_contentnode (rght);
CREATE INDEX ix_content_contentnode_tree_id ON content_contentnode (tree_id);
CREATE TABLE content_assessmentmetadata (
	id CHAR(32) NOT NULL,
	assessment_item_ids TEXT NOT NULL,
	number_of_assessments INTEGER NOT NULL,
	mastery_model TEXT NOT NULL,
	randomize BOOLEAN NOT NULL,
	is_manipulable BOOLEAN NOT NULL,
	contentnode_id CHAR(32) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(contentnode_id) REFERENCES content_contentnode (id)
);
CREATE INDEX ix_content_assessmentmetadata_contentnode_id ON content_assessmentmetadata (contentnode_id);
CREATE TABLE content_channelmetadata (
	id CHAR(32) NOT NULL,
	name VARCHAR(200) NOT NULL,
	description VARCHAR(400) NOT NULL,
	tagline VARCHAR(150),
	author VARCHAR(400) NOT NULL,
	version INTEGER NOT NULL,
	thumbnail TEXT NOT NULL,
	last_updated VARCHAR,
	min_schema_version VARCHAR(50) NOT NULL,
	root_id CHAR(32) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(root_id) REFERENCES content_contentnode (id)
);
CREATE INDEX ix_content_channelmetadata_root_id ON content_channelmetadata (root_id);
CREATE TABLE content_contentnode_has_prerequisite (
	id INTEGER NOT NULL,
	from_contentnode_id CHAR(32) NOT NULL,
	to_contentnode_id CHAR(32) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(from_contentnode_id) REFERENCES content_contentnode (id),
	FOREIGN KEY(to_contentnode_id) REFERENCES content_contentnode (id)
);
CREATE UNIQUE INDEX content_contentnode_has_prerequisite_from_contentnode_id_to_contentnode_id_c9e1d527_uniq ON content_contentnode_has_prerequisite (from_contentnode_id, to_contentnode_id);
CREATE INDEX ix_content_contentnode_has_prerequisite_from_contentnode_id ON content_contentnode_has_prerequisite (from_contentnode_id);
CREATE INDEX ix_content_contentnode_has_prerequisite_to_contentnode_id ON content_contentnode_has_prerequisite (to_contentnode_id);
CREATE TABLE content_contentnode_related (
	id INTEGER NOT NULL,
	from_contentnode_id CHAR(32) NOT NULL,
	to_contentnode_id CHAR(32) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(from_contentnode_id) REFERENCES content_contentnode (id),
	FOREIGN KEY(to_contentnode_id) REFERENCES content_contentnode (id)
);
CREATE UNIQUE INDEX content_contentnode_related_from_contentnode_id_to_contentnode_id_fc2ed20c_uniq ON content_contentnode_related (from_contentnode_id, to_contentnode_id);
CREATE INDEX ix_content_contentnode_related_from_contentnode_id ON content_contentnode_related (from_contentnode_id);
CREATE INDEX ix_content_contentnode_related_to_contentnode_id ON content_contentnode_related (to_contentnode_id);
CREATE TABLE content_contentnode_tags (
	id INTEGER NOT NULL,
	contentnode_id CHAR(32) NOT NULL,
	contenttag_id CHAR(32) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(contentnode_id) REFERENCES content_contentnode (id),
	FOREIGN KEY(contenttag_id) REFERENCES content_contenttag (id)
);
CREATE UNIQUE INDEX content_contentnode_tags_contentnode_id_contenttag_id_64a4ac15_uniq ON content_contentnode_tags (contentnode_id, contenttag_id);
CREATE INDEX ix_content_contentnode_tags_contentnode_id ON content_contentnode_tags (contentnode_id);
CREATE INDEX ix_content_contentnode_tags_contenttag_id ON content_contentnode_tags (contenttag_id);
CREATE TABLE content_file (
	id CHAR(32) NOT NULL,
	preset VARCHAR(150) NOT NULL,
	supplementary BOOLEAN NOT NULL,
	thumbnail BOOLEAN NOT NULL,
	priority INTEGER,
	included_presets INTEGER,
	contentnode_id CHAR(32) NOT NULL,
	lang_id VARCHAR(14),
	local_file_id VARCHAR(32) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(contentnode_id) REFERENCES content_contentnode (id),
	FOREIGN KEY(lang_id) REFERENCES content_language (id),
	FOREIGN KEY(local_file_id) REFERENCES content_localfile (id)
);
CREATE INDEX ix_content_file_contentnode_id ON content_file (contentnode_id);
CREATE INDEX ix_content_file_lang_id ON content_file (lang_id);
CREATE INDEX ix_content_file_local_file_id ON content_file (local_file_id);
CREATE INDEX ix_content_file_priority ON content_file (priority);
