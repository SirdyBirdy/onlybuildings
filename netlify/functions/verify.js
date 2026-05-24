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

  console.log('Image size (base64 chars):', image.length);
  console.log('Mime type:', mimeType);

  const prompt = `Look at this image. Does it contain any building, structure, or architecture at all — even partially? A house, office, wall, facade, ruin, bridge, tower, shed, or any constructed structure counts. Answer only with JSON, no markdown: {"isBuilding": true} or {"isBuilding": false, "reason": "brief lowercase reason"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: image } },
              { text: prompt }
            ]
          }],
          generationConfig: { maxOutputTokens: 100, temperature: 0 }
        })
      }
    );

    const data = await res.json();
    console.log('Gemini full response:', JSON.stringify(data));

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    console.log('Gemini raw text:', raw);

    const text = raw.replace(/```json|```/g, '').trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      console.log('JSON parse failed on:', text);
      result = { isBuilding: true }; // if we can't parse, let it through
    }

    console.log('Final result:', JSON.stringify(result));

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
