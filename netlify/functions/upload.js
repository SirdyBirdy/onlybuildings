// netlify/functions/upload.js
// Uploads a verified building photo to Cloudinary and stores the URL in Supabase

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

function cloudinaryUpload(base64, mimeType) {
  return new Promise((resolve, reject) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET; // unsigned preset

    const dataURI = `data:${mimeType};base64,${base64}`;
    const payload = JSON.stringify({
      file: dataURI,
      upload_preset: uploadPreset,
      folder: 'onlybuildings',
    });

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${cloudName}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.secure_url) resolve(parsed.secure_url);
          else reject(new Error(parsed.error?.message || 'Cloudinary upload failed'));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

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

  try {
    // 1. Upload to Cloudinary
    const imageUrl = await cloudinaryUpload(image, mimeType);

    // 2. Save URL to Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error } = await supabase
      .from('photos')
      .insert([{ url: imageUrl, submitted_at: new Date().toISOString() }]);

    if (error) {
      console.error('Supabase insert error:', error);
      // Still return the URL even if DB write fails — not ideal but graceful
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl }),
    };
  } catch (err) {
    console.error('Upload error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Upload failed', details: err.message }),
    };
  }
};
