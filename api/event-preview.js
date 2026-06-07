import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { eventId } = req.query;
  
  if (!eventId) {
    return res.status(400).send('Event ID required');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).send('Supabase configuration missing');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let title = 'Group Hangout Scheduler';
  let description = 'Find the best time for your group to meet.';

  try {
    const { data: event } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();

    if (event && event.name) {
      title = `${event.name} | Group Hangout`;
      description = `Join the hangout poll for ${event.name} and share your availability.`;
    }
  } catch (err) {
    console.error('Error fetching event:', err);
  }

  // On Vercel, built assets are in the root or dist depending on config
  // For Vite, they are usually in 'dist'
  let filePath = path.join(process.cwd(), 'dist', 'index.html');
  
  // Fallback to root index.html if dist doesn't exist (e.g. during local dev)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(process.cwd(), 'index.html');
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(500).send('Template index.html not found');
  }
  
  let html = fs.readFileSync(filePath, 'utf8');

  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  
  const metaTags = `
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
  `;

  html = html.replace('</head>', `${metaTags}</head>`);

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.status(200).send(html);
}
