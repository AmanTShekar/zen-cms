import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ChevronLeft, Clock, User } from 'lucide-react';
import './index.css';

// --- MOCK API (To be replaced with OpenAPI Fetch / SWR) ---
const MOCK_POSTS = [
  {
    slug: 'future-of-headless',
    title: 'The Future of Headless Content Management',
    excerpt: 'How glassmorphism and modern composable architectures are redefining the editor experience in 2026.',
    author: 'Aman T. Shekar',
    date: '2026-05-28',
    cover: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800'
  },
  {
    slug: 'tactical-design-systems',
    title: 'Building Tactical Design Systems',
    excerpt: 'Deploying deep obsidian and cyber-purple accents to create highly focused operational dashboards.',
    author: 'Design Team',
    date: '2026-05-25',
    cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800'
  },
  {
    slug: 'optimizing-edge-delivery',
    title: 'Optimizing Edge Delivery with Vite 5',
    excerpt: 'Why downgrading bundlers strategically can solve native binding collisions in multi-tenant systems.',
    author: 'Engineering',
    date: '2026-05-22',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800'
  }
];

// --- COMPONENTS ---

const Navbar = () => (
  <nav style={{
    position: 'fixed', top: 0, width: '100%', zIndex: 50,
    background: 'rgba(11, 15, 25, 0.7)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  }}>
    <div className="container flex-between" style={{ height: '70px' }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles color="var(--accent-emerald)" size={24} />
        <span style={{ fontWeight: 900, fontStyle: 'italic', fontSize: '1.25rem', letterSpacing: '0.1em', color: '#fff' }}>
          ZENITH<span style={{ color: 'var(--accent-purple)' }}>_DEMO</span>
        </span>
      </Link>
      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Articles</Link>
        <a href="http://localhost:5173" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Admin Login</a>
      </div>
    </div>
  </nav>
);

const PostCard = ({ post, index }: { post: any, index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1, duration: 0.5 }}
  >
    <Link to={`/post/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
      <div className="card card-interactive" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: '200px', width: '100%', overflow: 'hidden' }}>
          <img src={post.cover} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <span className="badge">{post.date}</span>
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>{post.title}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1 }}>{post.excerpt}</p>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <User size={14} /> {post.author}
            </div>
            <ArrowRight size={16} color="var(--accent-emerald)" />
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
);

// --- PAGES ---

const Home = () => {
  return (
    <div style={{ paddingTop: '120px', paddingBottom: '4rem' }}>
      <div className="container">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '5rem', padding: '4rem 2rem', borderRadius: '24px', background: 'radial-gradient(circle at center, rgba(139,92,246,0.15) 0%, transparent 70%)' }}
        >
          <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>
            Next-Gen <span className="text-gradient">Publishing</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
            Welcome to the Zenith CMS reference storefront. Experience headless delivery with absolute zero compromise on aesthetics.
          </p>
        </motion.div>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>Latest Intelligence</h2>
        
        <div className="grid-masonry">
          {MOCK_POSTS.map((post, i) => (
            <PostCard key={post.slug} post={post} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

const Article = () => {
  const { slug } = useParams();
  const post = MOCK_POSTS.find(p => p.slug === slug);

  if (!post) return <div className="container" style={{ paddingTop: '120px' }}><h1>404 - Not Found</h1></div>;

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '4rem' }}>
      <div style={{ height: '400px', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: -1, overflow: 'hidden' }}>
        <img src={post.cover} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} alt="" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, var(--bg-app))' }} />
      </div>
      
      <div className="container" style={{ maxWidth: '800px', marginTop: '100px' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-purple)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em', marginBottom: '2rem' }}>
          <ChevronLeft size={16} /> Back to Hub
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <span className="badge"><Clock size={12} style={{ marginRight: '4px' }}/> {post.date}</span>
          </div>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '2rem', textTransform: 'none', fontStyle: 'normal' }}>{post.title}</h1>
          
          <div className="card" style={{ padding: '3rem', fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <p style={{ fontSize: '1.25rem', color: '#fff', fontStyle: 'italic', marginBottom: '2rem', paddingLeft: '1.5rem', borderLeft: '4px solid var(--accent-emerald)' }}>
              {post.excerpt}
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="zenith-bg-mesh" />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/post/:slug" element={<Article />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
