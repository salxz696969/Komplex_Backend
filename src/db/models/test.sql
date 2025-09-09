-- PostgreSQL DDL generated from src/db/models/* definitions
-- Safe to run multiple times: uses IF NOT EXISTS and ordered for FKs

-- Enums
DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('image', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_status AS ENUM ('resolved', 'unresolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  is_admin BOOLEAN,
  is_verified BOOLEAN,
  is_social BOOLEAN,
  email TEXT,
  phone TEXT,
  profile_image TEXT,
  profile_image_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Content: Videos
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT,
  description TEXT,
  view_count INTEGER,
  type TEXT,
  topic TEXT,
  video_url TEXT,
  video_url_for_deletion TEXT,
  thumbnail_url TEXT,
  thumbnail_url_for_deletion TEXT,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Content: Blogs
CREATE TABLE IF NOT EXISTS blogs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT,
  description TEXT,
  type TEXT,
  topic TEXT,
  view_count INTEGER,
  like_amount INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_media (
  id SERIAL PRIMARY KEY,
  blog_id INTEGER REFERENCES blogs(id),
  url TEXT,
  url_for_deletion TEXT,
  media_type media_type,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Content: Forums
CREATE TABLE IF NOT EXISTS forums (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title TEXT,
  description TEXT,
  view_count INTEGER,
  type TEXT,
  topic TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_comments (
  id SERIAL PRIMARY KEY,
  forum_id INTEGER REFERENCES forums(id),
  user_id INTEGER REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_comment_medias (
  id SERIAL PRIMARY KEY,
  forum_comment_id INTEGER REFERENCES forum_comments(id),
  url TEXT,
  url_for_deletion TEXT,
  media_type media_type,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_likes (
  id SERIAL PRIMARY KEY,
  forum_id INTEGER REFERENCES forums(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_forum_like UNIQUE (forum_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_comment_likes (
  id SERIAL PRIMARY KEY,
  forum_comment_id INTEGER REFERENCES forum_comments(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_forum_comment_user UNIQUE (forum_comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id SERIAL PRIMARY KEY,
  forum_comment_id INTEGER REFERENCES forum_comments(id),
  user_id INTEGER REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_reply_medias (
  id SERIAL PRIMARY KEY,
  forum_reply_id INTEGER REFERENCES forum_replies(id),
  url TEXT,
  url_for_deletion TEXT,
  media_type media_type,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_reply_likes (
  id SERIAL PRIMARY KEY,
  forum_reply_id INTEGER REFERENCES forum_replies(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_forum_reply_user UNIQUE (forum_reply_id, user_id)
);

-- Content: Video comments & replies
CREATE TABLE IF NOT EXISTS video_comments (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES videos(id),
  user_id INTEGER REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_comment_medias (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  url_for_deletion TEXT,
  video_comment_id INTEGER REFERENCES video_comments(id),
  url TEXT,
  media_type media_type,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_comment_like (
  id SERIAL PRIMARY KEY,
  video_comment_id INTEGER REFERENCES video_comments(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_video_comment_user UNIQUE (video_comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS video_likes (
  id SERIAL PRIMARY KEY,
  video_id INTEGER REFERENCES videos(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_video_user_like UNIQUE (video_id, user_id)
);

CREATE TABLE IF NOT EXISTS video_replies (
  id SERIAL PRIMARY KEY,
  video_comment_id INTEGER REFERENCES video_comments(id),
  user_id INTEGER REFERENCES users(id),
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_reply_medias (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  url_for_deletion TEXT,
  video_reply_id INTEGER REFERENCES video_replies(id),
  url TEXT,
  media_type media_type,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_reply_like (
  id SERIAL PRIMARY KEY,
  video_reply_id INTEGER REFERENCES video_replies(id),
  user_id INTEGER REFERENCES users(id),
  media_type media_type,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_video_reply_user UNIQUE (video_reply_id, user_id)
);

-- Exercises and questions
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  video_id INTEGER,
  user_id INTEGER,
  duration INTEGER,
  title TEXT,
  description TEXT,
  subject TEXT,
  grade VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER,
  user_id INTEGER,
  title TEXT,
  question_type TEXT,
  section VARCHAR,
  image_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS choices (
  id SERIAL PRIMARY KEY,
  question_id INTEGER REFERENCES questions(id),
  text TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Social graphs and saves
CREATE TABLE IF NOT EXISTS followers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  followed_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_follow UNIQUE (user_id, followed_id)
);

CREATE TABLE IF NOT EXISTS user_saved_blogs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  blog_id INTEGER REFERENCES blogs(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_blog_save UNIQUE (user_id, blog_id)
);

CREATE TABLE IF NOT EXISTS user_saved_videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  video_id INTEGER REFERENCES videos(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_video UNIQUE (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS user_video_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  video_id INTEGER REFERENCES videos(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_video_history UNIQUE (user_id, video_id) 
);

-- AI & OAuth
CREATE TABLE IF NOT EXISTS user_ai_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  ai_result TEXT,
  prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_oauth (
  id SERIAL PRIMARY KEY,
  uid TEXT REFERENCES users(uid),
  provider TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exercise history
CREATE TABLE IF NOT EXISTS user_exercise_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  exercise_id INTEGER REFERENCES exercises(id),
  score INTEGER,
  time_taken INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_exercise UNIQUE (user_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS exercise_question_history (
  id SERIAL PRIMARY KEY,
  exercise_history_id INTEGER REFERENCES user_exercise_history(id),
  question_id INTEGER REFERENCES questions(id),
  is_correct BOOLEAN NOT NULL
);

-- Feedback
CREATE TABLE IF NOT EXISTS feedbacks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  content TEXT,
  type TEXT,
  status feedback_status,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_media (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER REFERENCES feedbacks(id),
  public_url TEXT,
  secure_url TEXT,
  media_type media_type,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


