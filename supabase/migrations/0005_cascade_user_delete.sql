-- Deleting a user from auth.users cascades to profiles; these references
-- must follow or the delete fails with "Database error deleting user".

alter table games
  drop constraint if exists games_white_id_fkey,
  add constraint games_white_id_fkey
    foreign key (white_id) references profiles(id) on delete cascade;

alter table games
  drop constraint if exists games_black_id_fkey,
  add constraint games_black_id_fkey
    foreign key (black_id) references profiles(id) on delete cascade;

alter table games
  drop constraint if exists games_draw_offer_by_fkey,
  add constraint games_draw_offer_by_fkey
    foreign key (draw_offer_by) references profiles(id) on delete set null;

alter table game_invites
  drop constraint if exists game_invites_created_by_fkey,
  add constraint game_invites_created_by_fkey
    foreign key (created_by) references profiles(id) on delete cascade;
