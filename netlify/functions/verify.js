// netlify/functions/verify.js
// Uses Claude Vision to confirm the photo contains a building

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing image or mimeType' }) };
  }

  // Validate mime type
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(mimeType)) {
    return {
      statusCode: 200,
      body: JSON.stringify({ isBuilding: false, reason: 'unsupported image format.' }),
    };
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: image },
            },
            {
              type: 'text',
              text: `You are a building verification system for a website called "Only Buildings" — a site that only shows photos of buildings and architecture.

Look at this image and decide: does it primarily show a building, structure, or piece of architecture? This includes houses, skyscrapers, churches, ruins, warehouses, bridges, towers, stadiums, bunkers, facades — any human-made structure. Even abstract or partial views of buildings count.

Respond with ONLY valid JSON in this exact format:
{"isBuilding": true} or {"isBuilding": false, "reason": "one short sentence explaining why not, in lowercase"}

No markdown. No explanation outside the JSON. Be lenient — if there's any significant architecture visible, say true.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0]?.text?.trim() || '{}';
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      // Claude said something weird; default to rejection
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
      body: JSON.stringify({ error: 'Verification failed', details: err.message }),
    };
  }
};
