import axios from 'axios';

async function seed() {
  console.log('Seeding collections via API...');
  
  try {
    // 1. Authenticate to get a token
    const authRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'admin@zenith.com',
      password: 'Zenith2024!'
    });
    
    const setCookie = authRes.headers['set-cookie'];
    if (!setCookie) {
      console.error('No set-cookie header found in login response.');
      return;
    }
    
    console.log('Got Auth Cookie');
    
    const axiosConfig = {
      headers: {
        Cookie: setCookie.join('; '),
        'Content-Type': 'application/json'
      }
    };
    
    // 2. Fetch all sites to find the first one
    const sitesRes = await axios.get('http://localhost:3000/api/v1/sites', axiosConfig);
    const site = sitesRes.data.data?.[0];
    if (!site) {
      console.error('No sites found. Aborting seed.');
      return;
    }
    
    const siteId = site.slug || site.id;
    console.log('Targeting Site ID:', siteId);
    
    // 3. Inject Site Header
    axiosConfig.headers['x-zenith-site-id'] = siteId;
    
    // 4. Create Mock Collections (if they don't exist, though Zenith might allow dynamic creation or require them in config)
    // Actually, we'll try to insert into some standard ones: 'posts', 'products', 'authors'
    
    const posts = [
      { title: 'The Future of Glassmorphism', slug: 'future-of-glass', content: 'Glassmorphism is back and better than ever in 2026...', status: 'published' },
      { title: 'Why Zenith CMS Rules', slug: 'zenith-cms-rules', content: 'Multi-tenant architecture provides incredible isolation...', status: 'published' },
      { title: 'React 19 Server Components', slug: 'react-19', content: 'Server components change the way we think about the UI...', status: 'draft' },
      { title: 'Building Dynamic Dashboards', slug: 'dynamic-dashboards', content: 'Using react-grid-layout allows users to create flexible UI...', status: 'published' },
      { title: 'The AI Developer Handbook', slug: 'ai-handbook', content: 'How AI agents are writing code and collaborating with engineers...', status: 'published' }
    ];
    
    console.log('Injecting Posts...');
    for (const post of posts) {
      try {
        await axios.post('http://localhost:3000/api/v1/posts', post, axiosConfig);
        console.log(` -> Created Post: ${post.title}`);
      } catch (err: any) {
        if (err.response?.status === 404) {
           console.log(` -> Collection 'posts' not found. Skipping.`);
           break;
        }
        console.error(` -> Failed Post ${post.title}:`, err.response?.data || err.message);
      }
    }
    
    const products = [
      { name: 'Zenith Pro License', slug: 'zenith-pro', price: 299, inStock: true },
      { name: 'Glassmorphism UI Kit', slug: 'ui-kit', price: 49, inStock: true },
      { name: 'Developer Enterprise Plan', slug: 'enterprise-plan', price: 999, inStock: false }
    ];
    
    console.log('Injecting Products...');
    for (const product of products) {
      try {
        await axios.post('http://localhost:3000/api/v1/products', product, axiosConfig);
        console.log(` -> Created Product: ${product.name}`);
      } catch (err: any) {
         if (err.response?.status === 404) {
           console.log(` -> Collection 'products' not found. Skipping.`);
           break;
        }
        console.error(` -> Failed Product ${product.name}:`, err.response?.data || err.message);
      }
    }
    
    console.log('\n✅ Seeding Complete!');
    
  } catch (err: any) {
    console.error('Seeding failed:', err.response?.data || err.message);
  }
}

seed();
