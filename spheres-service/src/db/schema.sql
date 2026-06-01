-- Spheres Service Schema

CREATE TABLE IF NOT EXISTS spheres (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    created_by  BIGINT NOT NULL,
    is_private  BOOLEAN DEFAULT FALSE,
    tags        TEXT[],
    banner_color VARCHAR(20) DEFAULT 'blue',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sphere_members (
    sphere_id  UUID REFERENCES spheres(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL,
    role       VARCHAR(20) DEFAULT 'member',  -- 'owner' | 'moderator' | 'member'
    joined_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (sphere_id, user_id)
);

CREATE TABLE IF NOT EXISTS sphere_posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sphere_id     UUID REFERENCES spheres(id) ON DELETE CASCADE,
    user_id       BIGINT NOT NULL,
    author_name   VARCHAR(200) NOT NULL DEFAULT 'Unknown',
    title         VARCHAR(300),
    content       TEXT NOT NULL,
    score         INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sphere_post_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID REFERENCES sphere_posts(id) ON DELETE CASCADE,
    sphere_id   UUID REFERENCES spheres(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL,
    author_name VARCHAR(200) NOT NULL DEFAULT 'Unknown',
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sphere_post_votes (
    post_id  UUID REFERENCES sphere_posts(id) ON DELETE CASCADE,
    user_id  BIGINT NOT NULL,
    vote     SMALLINT NOT NULL DEFAULT 1,
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sphere_members_user    ON sphere_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sphere_members_sphere  ON sphere_members(sphere_id);
CREATE INDEX IF NOT EXISTS idx_spheres_created_by     ON spheres(created_by);
CREATE INDEX IF NOT EXISTS idx_sphere_posts_sphere    ON sphere_posts(sphere_id);
CREATE INDEX IF NOT EXISTS idx_sphere_posts_user      ON sphere_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_sphere_comments_post   ON sphere_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_sphere_comments_sphere ON sphere_post_comments(sphere_id);

-- Full-text search
ALTER TABLE spheres ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED;
CREATE INDEX IF NOT EXISTS idx_spheres_fts ON spheres USING GIN(search_vector);
