export interface Announcement {
  id: string;
  title: string;
  content: string | null;
  link: string | null;
  image_url: string | null;
  type: 'bulletin' | 'emergency' | 'info';
  target_campus: 'paete' | 'pagsanjan' | 'both';
  created_by: string;
  creator_name?: string | null;
  is_active: boolean;
  display_until: string | null;
  created_at: string;
}
