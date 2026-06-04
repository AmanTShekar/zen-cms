(async () => {
  try {
    const loginRes = await fetch('http://localhost:5175/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-zenith-site-id': 'storefront-glass' },
      body: JSON.stringify({ email: 'admin@zenith.com', password: 'Zenith2024!' })
    });
    
    const loginData = await loginRes.json();
    const rawCookie = loginRes.headers.get('set-cookie');
    const token = rawCookie ? rawCookie.split(';')[0] : null;
    
    if (!token) {
      console.error('Login failed or no cookie', loginData);
      return;
    }
    
    const patchRes = await fetch('http://localhost:5175/api/v1/globals/site-settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': token,
        'x-zenith-site-id': 'storefront-glass'
      },
      body: JSON.stringify({ siteName: 'Test', sections: [] })
    });
    
    const patchText = await patchRes.text();
    console.log('Status:', patchRes.status);
    console.log('Body:', patchText);
  } catch (err) {
    console.error(err);
  }
})();
