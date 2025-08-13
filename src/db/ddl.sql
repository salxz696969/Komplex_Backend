create table users
(
    id            serial
        primary key,
    first_name    text,
    last_name     text,
    date_of_birth date,
    is_admin      boolean,
    is_verified   boolean,
    email         text,
    password      text,
    phone         text,
    created_at    timestamp,
    updated_at    timestamp
);

alter table users
    owner to postgres;

create table followers
(
    id          serial
        primary key,
    user_id     integer
        references users,
    followed_id integer
        references users,
    created_at  timestamp,
    updated_at  timestamp
);

alter table followers
    owner to postgres;

create table blogs
(
    id          serial
        primary key,
    user_id     integer
        references users,
    title       text,
    description text,
    image_url   text,
    type        text,
    topic       text,
    view_count  integer,
    created_at  timestamp,
    updated_at  timestamp,
    like_amount integer
);

alter table blogs
    owner to postgres;

create table forums
(
    id          serial
        primary key,
    user_id     integer
        references users,
    title       text,
    description text,
    view_count  integer,
    created_at  timestamp,
    updated_at  timestamp,
    type        text,
    topic       text
);

alter table forums
    owner to postgres;

create table forum_likes
(
    id         serial
        primary key,
    forum_id   integer
        references forums,
    user_id    integer
        references users,
    created_at timestamp,
    updated_at timestamp
);

alter table forum_likes
    owner to postgres;

create table forum_medias
(
    id         serial
        primary key,
    forum_id   integer
        references forums,
    url        text,
    media_type media_type,
    created_at timestamp,
    updated_at timestamp
);

alter table forum_medias
    owner to postgres;

create table forum_comments
(
    id          serial
        primary key,
    forum_id    integer
        references forums,
    user_id     integer
        references users,
    description text,
    created_at  timestamp,
    updated_at  timestamp
);

alter table forum_comments
    owner to postgres;

create table forum_replies
(
    id               serial
        primary key,
    forum_comment_id integer
        references forum_comments,
    user_id          integer
        references users,
    description      text,
    created_at       timestamp,
    updated_at       timestamp
);

alter table forum_replies
    owner to postgres;

create table videos
(
    id            serial
        primary key,
    user_id       integer
        references users,
    title         text,
    description   text,
    view_count    integer,
    video_url     text,
    thumbnail_url text,
    duration      integer,
    created_at    timestamp,
    updated_at    timestamp
);

alter table videos
    owner to postgres;

create table video_likes
(
    id         serial
        primary key,
    video_id   integer
        references videos,
    user_id    integer
        references users,
    created_at timestamp,
    updated_at timestamp
);

alter table video_likes
    owner to postgres;

create table video_comments
(
    id          serial
        primary key,
    video_id    integer
        references videos,
    user_id     integer
        references users,
    description text,
    image_url   text,
    created_at  timestamp,
    updated_at  timestamp
);

alter table video_comments
    owner to postgres;

create table video_replies
(
    id               serial
        primary key,
    video_comment_id integer
        references video_comments,
    user_id          integer
        references users,
    description      text,
    image_url        text,
    created_at       timestamp,
    updated_at       timestamp
);

alter table video_replies
    owner to postgres;

create table exercises
(
    id          serial
        primary key,
    user_id     integer
        references users,
    duration    integer,
    title       text,
    description text,
    subject     text,
    topic       text,
    grade       integer,
    created_at  timestamp,
    updated_at  timestamp
);

alter table exercises
    owner to postgres;

create table questions
(
    id            serial
        primary key,
    exercise_id   integer
        references exercises,
    user_id       integer
        references users,
    title         text,
    question_type text,
    points        integer,
    image_url     text,
    created_at    timestamp,
    updated_at    timestamp
);

alter table questions
    owner to postgres;

create table choices
(
    id          serial
        primary key,
    question_id integer
        references questions,
    text        text,
    is_correct  boolean,
    created_at  timestamp
);

alter table choices
    owner to postgres;

create table user_saved_blogs
(
    id         serial
        primary key,
    user_id    integer
        references users,
    blog_id    integer
        references blogs,
    created_at timestamp,
    updated_at timestamp
);

alter table user_saved_blogs
    owner to postgres;

create table user_saved_videos
(
    id         serial
        primary key,
    user_id    integer
        references users,
    video_id   integer
        references videos,
    created_at timestamp,
    updated_at timestamp
);

alter table user_saved_videos
    owner to postgres;

create table user_exercise_history
(
    id           serial
        primary key,
    user_id      integer
        references users,
    exercise_id  integer
        references exercises,
    score        integer,
    time_taken   integer,
    completed_at timestamp,
    created_at   timestamp,
    updated_at   timestamp
);

alter table user_exercise_history
    owner to postgres;

create table user_video_history
(
    id           serial
        primary key,
    user_id      integer
        references users,
    video_id     integer
        references videos,
    time_watched integer,
    watched_at   timestamp,
    created_at   timestamp,
    updated_at   timestamp
);

alter table user_video_history
    owner to postgres;

create table forum_comment_likes
(
    id               serial
        primary key,
    forum_comment_id integer
        references forum_comments,
    user_id          integer
        references users,
    created_at       timestamp,
    updated_at       timestamp
);

alter table forum_comment_likes
    owner to postgres;

create table forum_comment_medias
(
    id               serial
        primary key,
    forum_comment_id integer
        references forum_comments,
    url              text,
    media_type       media_type,
    created_at       timestamp,
    updated_at       timestamp
);

alter table forum_comment_medias
    owner to postgres;

create table forum_reply_likes
(
    id             serial
        primary key,
    forum_reply_id integer
        references forum_replies,
    user_id        integer
        references users,
    created_at     timestamp,
    updated_at     timestamp
);

alter table forum_reply_likes
    owner to postgres;

create table forum_reply_medias
(
    id             serial
        primary key,
    forum_reply_id integer
        references forum_replies,
    url            text,
    media_type     media_type,
    created_at     timestamp,
    updated_at     timestamp
);

alter table forum_reply_medias
    owner to postgres;

create table blog_media
(
    id         serial
        primary key,
    blog_id    integer
        references blogs,
    url        text,
    media_type media_type,
    created_at timestamp,
    updated_at timestamp
);

alter table blog_media
    owner to postgres;