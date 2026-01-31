export interface Profile {
  id: string;
  display_name?: string;
  location?: string;
  profile_image_url?: string;
  creator_type?: string;
}

export interface PortfolioItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title?: string;
  description?: string;
  category: string;
  is_featured: boolean;
  view_count: number;
  like_count: number;    // ADDED
  save_count: number;
  created_at: string;
  creator_id: string;
  profiles?: Profile;
}

export interface SearchResult extends PortfolioItem {
  creator_name?: string;
  creator_location?: string;
  creator_profile_image_url?: string;
  creator_type?: string;
  search_rank?: number;
  // REMOVED duplicate like_count and save_count
}

// Type for Supabase RPC search response
export interface SearchResultResponse {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title?: string;
  description?: string;
  category: string;
  is_featured: boolean;
  view_count: number;
  like_count: number;
  save_count: number;
  created_at: string;
  creator_id: string;
  creator_name?: string;
  creator_location?: string;
  creator_profile_image_url?: string;
  creator_type?: string;
  search_rank: number;
}

// Type for Supabase portfolio_items query with profiles join
export interface SupabasePortfolioItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  title?: string;
  description?: string;
  category: string;
  is_featured: boolean;
  view_count: number;
  like_count: number;
  save_count: number;
  created_at: string;
  creator_id: string;
  profiles: {
    id: string;
    display_name?: string;
    location?: string;
    profile_image_url?: string;
    creator_type?: string;
  } | null;
}