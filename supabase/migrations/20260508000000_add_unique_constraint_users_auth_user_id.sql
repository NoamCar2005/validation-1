ALTER TABLE users
  ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);
