CREATE TYPE "media_type" AS ENUM ('image', 'video');

CREATE TABLE "users" (
  id VARCHAR(36) PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  is_admin BOOLEAN,
  is_verified BOOLEAN,
  email TEXT,
  password TEXT,
  phone TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "followers" (
  id VARCHAR(36) PRIMARY KEY,
  follower_id VARCHAR(36) REFERENCES "users"(id),
  followed_id VARCHAR(36) REFERENCES "users"(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "blogs" (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES "users"(id),
  title TEXT,
  description TEXT,
  image_url TEXT,
  view_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "forums" (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES "users"(id),
  title TEXT,
  description TEXT,
  view_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "forum_likes" (
  id VARCHAR(36) PRIMARY KEY,
  forum_id VARCHAR(36) REFERENCES "forums"(id),
  user_id VARCHAR(36) REFERENCES "users"(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "forum_medias" (
  id VARCHAR(36) PRIMARY KEY,
  forum_id VARCHAR(36) REFERENCES "forums"(id),
  url TEXT,
  media_type "media_type",
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "forum_comments" (
  id VARCHAR(36) PRIMARY KEY,
  forum_id VARCHAR(36) REFERENCES "forums"(id),
  user_id VARCHAR(36) REFERENCES "users"(id),
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "forum_replies" (
  id VARCHAR(36) PRIMARY KEY,
  forum_comment_id VARCHAR(36) REFERENCES "forum_comments"(id),
  user_id VARCHAR(36) REFERENCES "users"(id),
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "videos" (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES "users"(id),
  title TEXT,
  description TEXT,
  view_count INTEGER,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "video_likes" (
  id VARCHAR(36) PRIMARY KEY,
  video_id VARCHAR(36) REFERENCES "videos"(id),
  user_id VARCHAR(36) REFERENCES "users"(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "video_comments" (
  id VARCHAR(36) PRIMARY KEY,
  video_id VARCHAR(36) REFERENCES "videos"(id),
  user_id VARCHAR(36) REFERENCES "users"(id),
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "video_replies" (
  id VARCHAR(36) PRIMARY KEY,
  video_comment_id VARCHAR(36) REFERENCES "video_comments"(id),
  user_id VARCHAR(36) REFERENCES "users"(id),
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "exercises" (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES "users"(id),
  duration INTEGER,
  title TEXT,
  description TEXT,
  subject TEXT,
  topic TEXT,
  grade INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "questions" (
  id VARCHAR(36) PRIMARY KEY,
  exercise_id VARCHAR(36) REFERENCES "exercises"(id),
  user_id VARCHAR(36) REFERENCES "users"(id),
  title TEXT,
  question_type TEXT,
  points INTEGER,
  image_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "choices" (
  id VARCHAR(36) PRIMARY KEY,
  question_id VARCHAR(36) REFERENCES "questions"(id),
  text TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMP
);

CREATE TABLE "user_saved_blogs" (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES "users"(id),
  blog_id VARCHAR(36) REFERENCES "blogs"(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "user_saved_videos" (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES "users"(id),
  video_id VARCHAR(36) REFERENCES "videos"(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "user_exercise_history" (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES "users"(id),
  exercise_id VARCHAR(36) REFERENCES "exercises"(id),
  score INTEGER,
  time_taken INTEGER,
  completed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE "user_video_history" (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES "users"(id),
  video_id VARCHAR(36) REFERENCES "videos"(id),
  time_watched INTEGER,
  watched_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
