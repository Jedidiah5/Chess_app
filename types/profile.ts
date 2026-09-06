export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  created_at: string;
};

export type OnboardedProfile = Profile & {
  username: string;
};

export function isOnboarded(profile: Profile): profile is OnboardedProfile {
  return profile.username !== null;
}
