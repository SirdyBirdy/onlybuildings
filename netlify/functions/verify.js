// netlify/functions/verify.js
// Uses Google Gemini Flash (free tier) to verify building photos

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { image, mimeType } = body;
  if (!image || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
  }

  const prompt = `You are a building verification system for a site called "Only Buildings".

Does this image primarily show a building, structure, or architecture? 
This includes houses, skyscrapers, churches, ruins, warehouses, bridges, towers, stadiums — any human-made structure. Be lenient — if significant architecture is visible, say true.

Respond ONLY with valid JSON, no markdown:
{"isBuilding": true} or {"isBuilding": false, "reason": "short lowercase explanation"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: image } }
            ]
          }],
          generationConfig: { maxOutputTokens: 100, temperature: 0 }
        })
      }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { isBuilding: false, reason: 'could not verify the image.' };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error('Verify error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Verification failed' }),
    };
  }
};
