function cloudinaryUpload(base64, mimeType) {
  return new Promise((resolve, reject) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    const dataURI = `data:${mimeType};base64,${base64}`;
    const payload = JSON.stringify({
      file: dataURI,
      upload_preset: uploadPreset,
      public_id: `ob_${Date.now()}`,
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
          console.log('Cloudinary response:', JSON.stringify(parsed));
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
