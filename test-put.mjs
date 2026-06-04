
(async () => {
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-zenith-site-id': 'storefront-glass' },
    body: JSON.stringify({ email: 'admin@zenith.com', password: 'Zenith2024!' })
  });
  
  const cookies = loginRes.headers.get('set-cookie');
  const accessTokenMatch = cookies.match(/accessToken=([^;]+)/);
  const csrfTokenMatch = cookies.match(/csrfToken=([^;]+)/);
  
  if (accessTokenMatch && csrfTokenMatch) {
    const accessToken = accessTokenMatch[1];
    const csrfToken = csrfTokenMatch[1];
    
    const putRes = await fetch('http://localhost:3000/api/v1/globals/site-settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-zenith-site-id': 'storefront-glass',
        'x-csrf-token': csrfToken,
        'cookie': 'accessToken=' + accessToken + '; csrfToken=' + csrfToken
      },
      body: JSON.stringify({ siteName: 'Test Name', supportEmail: 'test@example.com' })
    });
    console.log('PUT Status:', putRes.status);
    const text = await putRes.text();
    console.log('PUT Data:', text.substring(0, 500));
  }
})();

