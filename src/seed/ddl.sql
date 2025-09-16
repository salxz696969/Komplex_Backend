create type media_type as enum ('image', 'video');

create type feedback_status as enum ('resolved', 'unresolved', 'dismissed');

create table users
(
    id                serial
        primary key,
    uid               text
        unique,
    username          text,
    first_name        text,
    last_name         text,
    date_of_birth     date,
    is_admin          boolean,
    is_verified       boolean,
    is_social         boolean,
    email             text,
    phone             text,
    profile_image     text,
    profile_image_key text,
    created_at        timestamp default now(),
    updated_at        timestamp default now()
);


create index idx_users_uid
    on users (uid);

create index idx_users_email
    on users (email);

create index idx_users_username
    on users (username);

create index idx_users_created_at
    on users (created_at);

create index idx_users_updated_at
    on users (updated_at);

create index idx_users_is_admin
    on users (is_admin);

create index idx_users_is_verified
    on users (is_verified);

create table videos
(
    id                         serial
        primary key,
    user_id                    integer
        references users,
    title                      text,
    description                text,
    view_count                 integer,
    type                       text,
    topic                      text,
    video_url                  text,
    video_url_for_deletion     text,
    thumbnail_url              text,
    thumbnail_url_for_deletion text,
    duration                   integer,
    created_at                 timestamp default now(),
    updated_at                 timestamp default now()
);


create index idx_videos_user_id
    on videos (user_id);

create index idx_videos_type
    on videos (type);

create index idx_videos_topic
    on videos (topic);

create index idx_videos_created_at
    on videos (created_at);

create index idx_videos_updated_at
    on videos (updated_at);

create index idx_videos_view_count
    on videos (view_count);

create index idx_videos_user_type
    on videos (user_id, type);

create index idx_videos_user_topic
    on videos (user_id, topic);

create index idx_videos_type_topic
    on videos (type, topic);

create index idx_videos_user_created_desc
    on videos (user_id asc, created_at desc);

comment on index idx_videos_user_created_desc is 'Index for user videos ordered by creation date (descending)';

create index idx_videos_created_desc
    on videos (created_at desc);

comment on index idx_videos_created_desc is 'Index for all videos ordered by creation date (descending) - for feed queries';

create index idx_videos_view_count_desc
    on videos (view_count desc);

create index idx_videos_type_created_desc
    on videos (type asc, created_at desc);

create index idx_videos_topic_created_desc
    on videos (topic asc, created_at desc);

create table blogs
(
    id          serial
        primary key,
    user_id     integer
        references users,
    title       text,
    description text,
    type        text,
    topic       text,
    view_count  integer,
    like_amount integer,
    created_at  timestamp default now(),
    updated_at  timestamp default now()
);


create index idx_blogs_user_id
    on blogs (user_id);

create index idx_blogs_type
    on blogs (type);

create index idx_blogs_topic
    on blogs (topic);

create index idx_blogs_created_at
    on blogs (created_at);

create index idx_blogs_updated_at
    on blogs (updated_at);

create index idx_blogs_view_count
    on blogs (view_count);

create index idx_blogs_like_amount
    on blogs (like_amount);

create index idx_blogs_user_type
    on blogs (user_id, type);

create index idx_blogs_user_topic
    on blogs (user_id, topic);

create index idx_blogs_type_topic
    on blogs (type, topic);

create index idx_blogs_user_created_desc
    on blogs (user_id asc, created_at desc);

comment on index idx_blogs_user_created_desc is 'Index for user blogs ordered by creation date (descending)';

create index idx_blogs_created_desc
    on blogs (created_at desc);

comment on index idx_blogs_created_desc is 'Index for all blogs ordered by creation date (descending) - for feed queries';

create index idx_blogs_like_amount_desc
    on blogs (like_amount desc);

create index idx_blogs_type_created_desc
    on blogs (type asc, created_at desc);

create index idx_blogs_topic_created_desc
    on blogs (topic asc, created_at desc);

create table forums
(
    id          serial
        primary key,
    user_id     integer
        references users,
    title       text,
    description text,
    view_count  integer,
    type        text,
    topic       text,
    created_at  timestamp default now(),
    updated_at  timestamp default now()
);


create index idx_forums_user_id
    on forums (user_id);

create index idx_forums_type
    on forums (type);

create index idx_forums_topic
    on forums (topic);

create index idx_forums_created_at
    on forums (created_at);

create index idx_forums_updated_at
    on forums (updated_at);

create index idx_forums_view_count
    on forums (view_count);

create index idx_forums_user_type
    on forums (user_id, type);

create index idx_forums_user_topic
    on forums (user_id, topic);

create index idx_forums_type_topic
    on forums (type, topic);

create index idx_forums_user_created_desc
    on forums (user_id asc, created_at desc);

comment on index idx_forums_user_created_desc is 'Index for user forums ordered by creation date (descending)';

create index idx_forums_created_desc
    on forums (created_at desc);

comment on index idx_forums_created_desc is 'Index for all forums ordered by creation date (descending) - for feed queries';

create index idx_forums_view_count_desc
    on forums (view_count desc);

create index idx_forums_type_created_desc
    on forums (type asc, created_at desc);

create index idx_forums_topic_created_desc
    on forums (topic asc, created_at desc);

create table exercises
(
    id          serial
        primary key,
    video_id    integer,
    user_id     integer,
    duration    integer,
    title       text,
    description text,
    subject     text,
    grade       varchar,
    created_at  timestamp default now(),
    updated_at  timestamp default now()
);


create index idx_exercises_video_id
    on exercises (video_id);

create index idx_exercises_user_id
    on exercises (user_id);

create index idx_exercises_subject
    on exercises (subject);

create index idx_exercises_grade
    on exercises (grade);

create index idx_exercises_created_at
    on exercises (created_at);

create index idx_exercises_updated_at
    on exercises (updated_at);

create index idx_exercises_video_user
    on exercises (video_id, user_id);

create index idx_exercises_subject_grade
    on exercises (subject, grade);

create table questions
(
    id            serial
        primary key,
    exercise_id   integer,
    user_id       integer,
    title         text,
    question_type text,
    section       varchar,
    image_url     text,
    created_at    timestamp,
    updated_at    timestamp
);


create index idx_questions_exercise_id
    on questions (exercise_id);

create index idx_questions_user_id
    on questions (user_id);

create index idx_questions_question_type
    on questions (question_type);

create index idx_questions_section
    on questions (section);

create index idx_questions_created_at
    on questions (created_at);

create index idx_questions_updated_at
    on questions (updated_at);

create index idx_questions_exercise_type
    on questions (exercise_id, question_type);

create table feedbacks
(
    id         serial
        primary key,
    user_id    integer
        references users,
    content    text,
    type       text,
    status     feedback_status,
    created_at timestamp default now(),
    updated_at timestamp default now()
);


create index idx_feedbacks_user_id
    on feedbacks (user_id);

create index idx_feedbacks_type
    on feedbacks (type);

create index idx_feedbacks_status
    on feedbacks (status);

create index idx_feedbacks_created_at
    on feedbacks (created_at);

create index idx_feedbacks_updated_at
    on feedbacks (updated_at);

create index idx_feedbacks_user_created
    on feedbacks (user_id, created_at);

create index idx_feedbacks_status_created
    on feedbacks (status, created_at);

create table blog_media
(
    id               serial
        primary key,
    blog_id          integer
        references blogs,
    url              text,
    url_for_deletion text,
    media_type       media_type,
    created_at       timestamp default now(),
    updated_at       timestamp default now()
);


create index idx_blog_media_blog_id
    on blog_media (blog_id);

create index idx_blog_media_created_at
    on blog_media (created_at);

create index idx_blog_media_updated_at
    on blog_media (updated_at);

create table forum_medias
(
    id               serial
        primary key,
    forum_id         integer
        references forums,
    url              text,
    url_for_deletion text,
    created_at       timestamp default now(),
    updated_at       timestamp default now(),
    media_type       media_type
);


create index idx_forum_medias_forum_id
    on forum_medias (forum_id);

create index idx_forum_medias_created_at
    on forum_medias (created_at);

create index idx_forum_medias_updated_at
    on forum_medias (updated_at);

create table feedback_media
(
    id          serial
        primary key,
    feedback_id integer
        references feedbacks,
    public_url  text,
    secure_url  text,
    media_type  media_type,
    created_at  timestamp default now(),
    updated_at  timestamp default now()
);


create index idx_feedback_media_feedback_id
    on feedback_media (feedback_id);

create index idx_feedback_media_created_at
    on feedback_media (created_at);

create index idx_feedback_media_updated_at
    on feedback_media (updated_at);

create table forum_comments
(
    id          serial
        primary key,
    forum_id    integer
        references forums,
    user_id     integer
        references users,
    description text,
    created_at  timestamp default now(),
    updated_at  timestamp default now()
);


create index idx_forum_comments_forum_id
    on forum_comments (forum_id);

create index idx_forum_comments_user_id
    on forum_comments (user_id);

create index idx_forum_comments_created_at
    on forum_comments (created_at);

create index idx_forum_comments_updated_at
    on forum_comments (updated_at);

create index idx_forum_comments_forum_created
    on forum_comments (forum_id, created_at);

create table video_comments
(
    id          serial
        primary key,
    video_id    integer
        references videos,
    user_id     integer
        references users,
    description text,
    created_at  timestamp default now(),
    updated_at  timestamp default now()
);


create index idx_video_comments_video_id
    on video_comments (video_id);

create index idx_video_comments_user_id
    on video_comments (user_id);

create index idx_video_comments_created_at
    on video_comments (created_at);

create index idx_video_comments_updated_at
    on video_comments (updated_at);

create index idx_video_comments_video_created
    on video_comments (video_id, created_at);

create table forum_replies
(
    id               serial
        primary key,
    forum_comment_id integer
        references forum_comments,
    user_id          integer
        references users,
    description      text,
    created_at       timestamp default now(),
    updated_at       timestamp default now()
);


create index idx_forum_replies_comment_id
    on forum_replies (forum_comment_id);

create index idx_forum_replies_user_id
    on forum_replies (user_id);

create index idx_forum_replies_created_at
    on forum_replies (created_at);

create index idx_forum_replies_updated_at
    on forum_replies (updated_at);

create index idx_forum_replies_comment_created
    on forum_replies (forum_comment_id, created_at);

create table video_replies
(
    id               serial
        primary key,
    video_comment_id integer
        references video_comments,
    user_id          integer
        references users,
    description      text,
    created_at       timestamp default now(),
    updated_at       timestamp default now()
);


create index idx_video_replies_comment_id
    on video_replies (video_comment_id);

create index idx_video_replies_user_id
    on video_replies (user_id);

create index idx_video_replies_created_at
    on video_replies (created_at);

create index idx_video_replies_updated_at
    on video_replies (updated_at);

create index idx_video_replies_comment_created
    on video_replies (video_comment_id, created_at);

create table choices
(
    id          serial
        primary key,
    question_id integer
        references questions,
    text        text,
    is_correct  boolean,
    created_at  timestamp default now(),
    updated_at  timestamp default now()
);


create index idx_choices_question_id
    on choices (question_id);

create index idx_choices_is_correct
    on choices (is_correct);

create index idx_choices_created_at
    on choices (created_at);

create index idx_choices_updated_at
    on choices (updated_at);

create table forum_comment_medias
(
    id               serial
        primary key,
    forum_comment_id integer
        references forum_comments,
    url              text,
    url_for_deletion text,
    media_type       media_type,
    created_at       timestamp default now(),
    updated_at       timestamp default now()
);


create index idx_forum_comment_medias_comment_id
    on forum_comment_medias (forum_comment_id);

create index idx_forum_comment_medias_created_at
    on forum_comment_medias (created_at);

create index idx_forum_comment_medias_updated_at
    on forum_comment_medias (updated_at);

create table video_comment_medias
(
    id               serial
        primary key,
    user_id          integer
        references users,
    url_for_deletion text,
    video_comment_id integer
        references video_comments,
    url              text,
    media_type       media_type,
    created_at       timestamp default now(),
    updated_at       timestamp default now()
);


create index idx_video_comment_medias_comment_id
    on video_comment_medias (video_comment_id);

create index idx_video_comment_medias_user_id
    on video_comment_medias (user_id);

create index idx_video_comment_medias_created_at
    on video_comment_medias (created_at);

create index idx_video_comment_medias_updated_at
    on video_comment_medias (updated_at);

create table forum_reply_medias
(
    id               serial
        primary key,
    forum_reply_id   integer
        references forum_replies,
    url              text,
    url_for_deletion text,
    media_type       media_type,
    created_at       timestamp default now(),
    updated_at       timestamp default now()
);


create index idx_forum_reply_medias_reply_id
    on forum_reply_medias (forum_reply_id);

create index idx_forum_reply_medias_created_at
    on forum_reply_medias (created_at);

create index idx_forum_reply_medias_updated_at
    on forum_reply_medias (updated_at);

create table video_reply_medias
(
    id               serial
        primary key,
    user_id          integer
        references users,
    url_for_deletion text,
    video_reply_id   integer
        references video_replies,
    url              text,
    media_type       media_type,
    created_at       timestamp default now(),
    updated_at       timestamp default now()
);


create index idx_video_reply_medias_reply_id
    on video_reply_medias (video_reply_id);

create index idx_video_reply_medias_user_id
    on video_reply_medias (user_id);

create index idx_video_reply_medias_created_at
    on video_reply_medias (created_at);

create index idx_video_reply_medias_updated_at
    on video_reply_medias (updated_at);

create table forum_likes
(
    id         serial
        primary key,
    forum_id   integer
        references forums,
    user_id    integer
        references users,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    constraint unique_user_forum_like
        unique (forum_id, user_id)
);


create index idx_forum_likes_forum_id
    on forum_likes (forum_id);

create index idx_forum_likes_user_id
    on forum_likes (user_id);

create index idx_forum_likes_created_at
    on forum_likes (created_at);

create index idx_forum_likes_updated_at
    on forum_likes (updated_at);

create table video_likes
(
    id         serial
        primary key,
    video_id   integer
        references videos,
    user_id    integer
        references users,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    constraint unique_video_user_like
        unique (video_id, user_id)
);


create index idx_video_likes_video_id
    on video_likes (video_id);

create index idx_video_likes_user_id
    on video_likes (user_id);

create index idx_video_likes_created_at
    on video_likes (created_at);

create index idx_video_likes_updated_at
    on video_likes (updated_at);

create table forum_comment_likes
(
    id               serial
        primary key,
    forum_comment_id integer
        references forum_comments,
    user_id          integer
        references users,
    created_at       timestamp default now(),
    updated_at       timestamp default now(),
    constraint unique_forum_comment_user
        unique (forum_comment_id, user_id)
);


create index idx_forum_comment_likes_comment_id
    on forum_comment_likes (forum_comment_id);

create index idx_forum_comment_likes_user_id
    on forum_comment_likes (user_id);

create index idx_forum_comment_likes_created_at
    on forum_comment_likes (created_at);

create index idx_forum_comment_likes_updated_at
    on forum_comment_likes (updated_at);

create table video_comment_like
(
    id               serial
        primary key,
    video_comment_id integer
        references video_comments,
    user_id          integer
        references users,
    created_at       timestamp default now(),
    updated_at       timestamp default now(),
    constraint unique_video_comment_user
        unique (video_comment_id, user_id)
);


create index idx_video_comment_like_comment_id
    on video_comment_like (video_comment_id);

create index idx_video_comment_like_user_id
    on video_comment_like (user_id);

create index idx_video_comment_like_created_at
    on video_comment_like (created_at);

create index idx_video_comment_like_updated_at
    on video_comment_like (updated_at);

create table forum_reply_likes
(
    id             serial
        primary key,
    forum_reply_id integer
        references forum_replies,
    user_id        integer
        references users,
    created_at     timestamp default now(),
    updated_at     timestamp default now(),
    constraint unique_forum_reply_user
        unique (forum_reply_id, user_id)
);


create index idx_forum_reply_likes_reply_id
    on forum_reply_likes (forum_reply_id);

create index idx_forum_reply_likes_user_id
    on forum_reply_likes (user_id);

create index idx_forum_reply_likes_created_at
    on forum_reply_likes (created_at);

create index idx_forum_reply_likes_updated_at
    on forum_reply_likes (updated_at);

create table video_reply_like
(
    id             serial
        primary key,
    video_reply_id integer
        references video_replies,
    user_id        integer
        references users,
    media_type     media_type,
    created_at     timestamp default now(),
    updated_at     timestamp default now(),
    constraint unique_video_reply_user
        unique (video_reply_id, user_id)
);


create index idx_video_reply_like_reply_id
    on video_reply_like (video_reply_id);

create index idx_video_reply_like_user_id
    on video_reply_like (user_id);

create index idx_video_reply_like_created_at
    on video_reply_like (created_at);

create index idx_video_reply_like_updated_at
    on video_reply_like (updated_at);

create table followers
(
    id          serial
        primary key,
    user_id     integer
        references users,
    followed_id integer
        references users,
    created_at  timestamp default now(),
    updated_at  timestamp default now(),
    constraint unique_user_follow
        unique (user_id, followed_id)
);


create index idx_followers_user_id
    on followers (user_id);

create index idx_followers_followed_id
    on followers (followed_id);

create index idx_followers_created_at
    on followers (created_at);

create index idx_followers_updated_at
    on followers (updated_at);

create index idx_followers_user_followed
    on followers (user_id, followed_id);

create table user_saved_blogs
(
    id         serial
        primary key,
    user_id    integer
        references users,
    blog_id    integer
        references blogs,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    constraint unique_user_blog_save
        unique (user_id, blog_id)
);


create index idx_user_saved_blogs_user_id
    on user_saved_blogs (user_id);

create index idx_user_saved_blogs_blog_id
    on user_saved_blogs (blog_id);

create index idx_user_saved_blogs_created_at
    on user_saved_blogs (created_at);

create index idx_user_saved_blogs_updated_at
    on user_saved_blogs (updated_at);

create table user_saved_videos
(
    id         serial
        primary key,
    user_id    integer
        references users,
    video_id   integer
        references videos,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    constraint unique_user_video
        unique (user_id, video_id)
);


create index idx_user_saved_videos_user_id
    on user_saved_videos (user_id);

create index idx_user_saved_videos_video_id
    on user_saved_videos (video_id);

create index idx_user_saved_videos_created_at
    on user_saved_videos (created_at);

create index idx_user_saved_videos_updated_at
    on user_saved_videos (updated_at);

create table user_video_history
(
    id         serial
        primary key,
    user_id    integer
        references users,
    video_id   integer
        references videos,
    created_at timestamp default now(),
    updated_at timestamp default now()
);


create index idx_user_video_history_user_id
    on user_video_history (user_id);

create index idx_user_video_history_video_id
    on user_video_history (video_id);

create index idx_user_video_history_created_at
    on user_video_history (created_at);

create index idx_user_video_history_updated_at
    on user_video_history (updated_at);

create index idx_user_video_history_user_created
    on user_video_history (user_id, created_at);

create index idx_user_video_history_user_created_desc
    on user_video_history (user_id asc, created_at desc);

create table user_ai_history
(
    id         serial
        primary key,
    user_id    integer
        references users,
    ai_result  text,
    prompt     text,
    created_at timestamp default now(),
    updated_at timestamp default now()
);


create index idx_user_ai_history_user_id
    on user_ai_history (user_id);

create index idx_user_ai_history_created_at
    on user_ai_history (created_at);

create index idx_user_ai_history_updated_at
    on user_ai_history (updated_at);

create index idx_user_ai_history_user_created
    on user_ai_history (user_id, created_at);

create index idx_user_ai_history_user_created_desc
    on user_ai_history (user_id asc, created_at desc);

create table user_oauth
(
    id         serial
        primary key,
    uid        text
        references users (uid),
    provider   text,
    created_at timestamp default now()
);


create index idx_user_oauth_uid
    on user_oauth (uid);

create index idx_user_oauth_provider
    on user_oauth (provider);

create index idx_user_oauth_created_at
    on user_oauth (created_at);

create table user_exercise_history
(
    id          serial
        primary key,
    user_id     integer
        references users,
    exercise_id integer
        references exercises,
    score       integer,
    time_taken  integer,
    created_at  timestamp default now(),
    updated_at  timestamp default now()
);


create index idx_user_exercise_history_user_id
    on user_exercise_history (user_id);

create index idx_user_exercise_history_exercise_id
    on user_exercise_history (exercise_id);

create index idx_user_exercise_history_created_at
    on user_exercise_history (created_at);

create index idx_user_exercise_history_updated_at
    on user_exercise_history (updated_at);

create index idx_user_exercise_history_user_created
    on user_exercise_history (user_id, created_at);

create index idx_user_exercise_history_user_created_desc
    on user_exercise_history (user_id asc, created_at desc);

create table exercise_question_history
(
    id                  serial
        primary key,
    exercise_history_id integer
        references user_exercise_history,
    question_id         integer
        references questions,
    is_correct          boolean not null
);


create index idx_exercise_question_history_exercise_history_id
    on exercise_question_history (exercise_history_id);

create index idx_exercise_question_history_question_id
    on exercise_question_history (question_id);

create index idx_exercise_question_history_is_correct
    on exercise_question_history (is_correct);

create function update_updated_at_column() returns trigger
    language plpgsql
as
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

comment on function update_updated_at_column() is 'Function to automatically update the updated_at timestamp when a record is modified';

create trigger update_users_updated_at
    before update
    on users
    for each row
execute procedure update_updated_at_column();

create trigger update_videos_updated_at
    before update
    on videos
    for each row
execute procedure update_updated_at_column();

create trigger update_blogs_updated_at
    before update
    on blogs
    for each row
execute procedure update_updated_at_column();

create trigger update_forums_updated_at
    before update
    on forums
    for each row
execute procedure update_updated_at_column();

create trigger update_exercises_updated_at
    before update
    on exercises
    for each row
execute procedure update_updated_at_column();

create trigger update_questions_updated_at
    before update
    on questions
    for each row
execute procedure update_updated_at_column();

create trigger update_feedbacks_updated_at
    before update
    on feedbacks
    for each row
execute procedure update_updated_at_column();

create trigger update_blog_media_updated_at
    before update
    on blog_media
    for each row
execute procedure update_updated_at_column();

create trigger update_forum_medias_updated_at
    before update
    on forum_medias
    for each row
execute procedure update_updated_at_column();

create trigger update_feedback_media_updated_at
    before update
    on feedback_media
    for each row
execute procedure update_updated_at_column();

create trigger update_forum_comments_updated_at
    before update
    on forum_comments
    for each row
execute procedure update_updated_at_column();

create trigger update_video_comments_updated_at
    before update
    on video_comments
    for each row
execute procedure update_updated_at_column();

create trigger update_forum_replies_updated_at
    before update
    on forum_replies
    for each row
execute procedure update_updated_at_column();

create trigger update_video_replies_updated_at
    before update
    on video_replies
    for each row
execute procedure update_updated_at_column();

create trigger update_choices_updated_at
    before update
    on choices
    for each row
execute procedure update_updated_at_column();

create trigger update_forum_comment_medias_updated_at
    before update
    on forum_comment_medias
    for each row
execute procedure update_updated_at_column();

create trigger update_video_comment_medias_updated_at
    before update
    on video_comment_medias
    for each row
execute procedure update_updated_at_column();

create trigger update_forum_reply_medias_updated_at
    before update
    on forum_reply_medias
    for each row
execute procedure update_updated_at_column();

create trigger update_video_reply_medias_updated_at
    before update
    on video_reply_medias
    for each row
execute procedure update_updated_at_column();

create trigger update_forum_likes_updated_at
    before update
    on forum_likes
    for each row
execute procedure update_updated_at_column();

create trigger update_video_likes_updated_at
    before update
    on video_likes
    for each row
execute procedure update_updated_at_column();

create trigger update_forum_comment_likes_updated_at
    before update
    on forum_comment_likes
    for each row
execute procedure update_updated_at_column();

create trigger update_video_comment_like_updated_at
    before update
    on video_comment_like
    for each row
execute procedure update_updated_at_column();

create trigger update_forum_reply_likes_updated_at
    before update
    on forum_reply_likes
    for each row
execute procedure update_updated_at_column();

create trigger update_video_reply_like_updated_at
    before update
    on video_reply_like
    for each row
execute procedure update_updated_at_column();

create trigger update_followers_updated_at
    before update
    on followers
    for each row
execute procedure update_updated_at_column();

create trigger update_user_saved_blogs_updated_at
    before update
    on user_saved_blogs
    for each row
execute procedure update_updated_at_column();

create trigger update_user_saved_videos_updated_at
    before update
    on user_saved_videos
    for each row
execute procedure update_updated_at_column();

create trigger update_user_video_history_updated_at
    before update
    on user_video_history
    for each row
execute procedure update_updated_at_column();

create trigger update_user_ai_history_updated_at
    before update
    on user_ai_history
    for each row
execute procedure update_updated_at_column();

create trigger update_user_exercise_history_updated_at
    before update
    on user_exercise_history
    for each row
execute procedure update_updated_at_column();

