import React from 'react';

/**
 * Zenith CMS - Glassmorphism Storefront Template
 * ──────────────────────────────────────────────
 * This template provides the exact markup and CSS structure needed 
 * to recreate the premium Zenith CMS storefront demo.
 * 
 * Usage:
 * Combine this with `packages/blog-demo/src/index.css` to instantly scaffold
 * a state-of-the-art Glassmorphism storefront.
 */

export const ZenithStorefrontTemplate = () => {
  return (
    <>
      <div className="zenith-bg-mesh" />
      
      {/* Premium Glass Navbar */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        background: 'rgba(11, 15, 25, 0.7)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div className="container flex-between" style={{ height: '70px' }}>
          <span style={{ fontWeight: 900, fontStyle: 'italic', fontSize: '1.25rem', letterSpacing: '0.1em', color: '#fff' }}>
            ZENITH<span style={{ color: 'var(--accent-purple)' }}>_STOREFRONT</span>
          </span>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <a href="#" style={{ color: '#fff', textDecoration: 'none' }}>Home</a>
            <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Admin</a>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div style={{ paddingTop: '120px', paddingBottom: '4rem' }}>
        <div className="container">
          
          {/* Hero Section */}
          <div style={{ textAlign: 'center', marginBottom: '5rem', padding: '4rem 2rem', borderRadius: '24px', background: 'radial-gradient(circle at center, rgba(139,92,246,0.15) 0%, transparent 70%)' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              Your <span className="text-gradient">Title</span> Here
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
              The definitive headless storefront layout. Replace this text with your landing page subtitle.
            </p>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>Latest Posts</h2>
          
          {/* Glassmorphism Grid */}
          <div className="grid-masonry">
            {/* Example Card */}
            <div className="card card-interactive" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '200px', width: '100%', overflow: 'hidden', background: 'var(--glass-bg)' }}>
                {/* Image Placeholder */}
              </div>
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <span className="badge">2026-05-28</span>
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>Post Title</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1 }}>
                  Post excerpt goes here. The card will expand to fit the content cleanly.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
