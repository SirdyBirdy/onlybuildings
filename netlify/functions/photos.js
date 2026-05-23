// netlify/functions/photos.js
// Returns all building photos from Supabase, newest first

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from('photos')
      .select('url, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const photos = (data || []).map(row => row.url);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30', // 30s cache; fresh enough
      },
      body: JSON.stringify({ photos }),
    };
  } catch (err) {
    console.error('Photos fetch error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch photos' }),
    };
  }
};
