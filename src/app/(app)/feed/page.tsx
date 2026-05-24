import { createClient } from '@/lib/supabase/server'
import FeedClient from './FeedClient'

export default async function FeedPage() {
  const supabase = await createClient()

  const { data: feed } = await supabase
    .from('activity_feed')
    .select('*, profiles(username, avatar_url), habits(name, emoji, color)')
    .order('created_at', { ascending: false })
    .limit(100)

  return <FeedClient feed={feed ?? []} />
}
