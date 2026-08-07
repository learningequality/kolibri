CREATE TABLE content_channelmetadata (
	id CHAR(32) NOT NULL,
	name VARCHAR(200) NOT NULL,
	description VARCHAR(400) NOT NULL,
	author VARCHAR(400) NOT NULL,
	version INTEGER NOT NULL,
	thumbnail TEXT NOT NULL,
	root_pk CHAR(32) NOT NULL,
	PRIMARY KEY (id)
);
CREATE TABLE content_contenttag (
	id CHAR(32) NOT NULL,
	tag_name VARCHAR(30) NOT NULL,
	PRIMARY KEY (id)
);
CREATE TABLE content_language (
	id VARCHAR(7) NOT NULL,
	lang_code VARCHAR(3) NOT NULL,
	lang_subcode VARCHAR(3),
	PRIMARY KEY (id)
);
CREATE INDEX ix_content_language_lang_code ON content_language (lang_code);
CREATE INDEX ix_content_language_lang_subcode ON content_language (lang_subcode);
CREATE TABLE content_license (
	id INTEGER NOT NULL,
	license_name VARCHAR(50) NOT NULL,
	PRIMARY KEY (id)
);
CREATE TABLE content_contentnode (
	id CHAR(32) NOT NULL,
	title VARCHAR(200) NOT NULL,
	content_id CHAR(32) NOT NULL,
	description VARCHAR(400),
	sort_order FLOAT,
	license_owner VARCHAR(200) NOT NULL,
	author VARCHAR(200) NOT NULL,
	kind VARCHAR(200) NOT NULL,
	available BOOLEAN NOT NULL,
	lft INTEGER NOT NULL,
	rght INTEGER NOT NULL,
	tree_id INTEGER NOT NULL,
	level INTEGER NOT NULL,
	license_id INTEGER,
	stemmed_metaphone VARCHAR(1800) NOT NULL,
	parent_id CHAR(32),
	PRIMARY KEY (id),
	FOREIGN KEY(license_id) REFERENCES content_license (id),
	FOREIGN KEY(parent_id) REFERENCES content_contentnode (id)
);
CREATE INDEX ix_content_contentnode_level ON content_contentnode (level);
CREATE INDEX ix_content_contentnode_lft ON content_contentnode (lft);
CREATE INDEX ix_content_contentnode_license_id ON content_contentnode (license_id);
CREATE INDEX ix_content_contentnode_parent_id ON content_contentnode (parent_id);
CREATE INDEX ix_content_contentnode_rght ON content_contentnode (rght);
CREATE INDEX ix_content_contentnode_tree_id ON content_contentnode (tree_id);
CREATE TABLE content_contentnode_has_prerequisite (
	id INTEGER NOT NULL,
	from_contentnode_id CHAR(32) NOT NULL,
	to_contentnode_id CHAR(32) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(from_contentnode_id) REFERENCES content_contentnode (id),
	FOREIGN KEY(to_contentnode_id) REFERENCES content_contentnode (id)
);
CREATE UNIQUE INDEX content_contentnode_has_prerequisite_from_contentnode_id_c9e1d527_uniq ON content_contentnode_has_prerequisite (from_contentnode_id, to_contentnode_id);
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
CREATE UNIQUE INDEX content_contentnode_related_from_contentnode_id_fc2ed20c_uniq ON content_contentnode_related (from_contentnode_id, to_contentnode_id);
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
CREATE UNIQUE INDEX content_contentnode_tags_contentnode_id_64a4ac15_uniq ON content_contentnode_tags (contentnode_id, contenttag_id);
CREATE INDEX ix_content_contentnode_tags_contentnode_id ON content_contentnode_tags (contentnode_id);
CREATE INDEX ix_content_contentnode_tags_contenttag_id ON content_contentnode_tags (contenttag_id);
CREATE TABLE content_file (
	id CHAR(32) NOT NULL,
	checksum VARCHAR(400) NOT NULL,
	extension VARCHAR(40) NOT NULL,
	available BOOLEAN NOT NULL,
	file_size INTEGER,
	supplementary BOOLEAN NOT NULL,
	thumbnail BOOLEAN NOT NULL,
	priority INTEGER,
	contentnode_id CHAR(32),
	lang_id VARCHAR(7),
	preset VARCHAR(150) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(contentnode_id) REFERENCES content_contentnode (id),
	FOREIGN KEY(lang_id) REFERENCES content_language (id)
);
CREATE INDEX ix_content_file_contentnode_id ON content_file (contentnode_id);
CREATE INDEX ix_content_file_lang_id ON content_file (lang_id);
