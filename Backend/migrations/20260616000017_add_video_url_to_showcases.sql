-- +goose Up
ALTER TABLE freelancer_showcases ADD COLUMN video_url TEXT;

-- +goose Down
ALTER TABLE freelancer_showcases DROP COLUMN video_url;
