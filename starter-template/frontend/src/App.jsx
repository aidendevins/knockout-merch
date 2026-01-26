import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [apiStatus, setApiStatus] = useState('checking...');
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    // Test API connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    
    fetch(`${API_URL}/status`)
      .then(res => res.json())
      .then(data => {
        setApiStatus('✅ Connected');
        setApiMessage(data.status);
      })
      .catch(() => {
        setApiStatus('⚠️ Not connected');
        setApiMessage('Start backend server');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            API Status: {apiStatus}
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-7xl font-black text-white mb-6 tracking-tight">
            Your Awesome
            <br />
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Project Name
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-white/80 mb-12 max-w-2xl mx-auto">
            Built with React, Express, and deployed on Vercel + Railway.
            Ready to customize and scale.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="px-8 py-4 bg-white text-purple-900 font-bold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl">
              Get Started
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-lg hover:bg-white/20 transition-all border border-white/20">
              Learn More
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <FeatureCard
            icon="⚡"
            title="Lightning Fast"
            description="Built with Vite for instant hot reload and optimized builds"
          />
          <FeatureCard
            icon="🎨"
            title="Beautiful Design"
            description="Tailwind CSS for rapid, responsive, and modern UI development"
          />
          <FeatureCard
            icon="🚀"
            title="Deploy Ready"
            description="Pre-configured for Vercel (frontend) and Railway (backend)"
          />
        </div>

        {/* API Test Section */}
        <div className="mt-24 max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">🔌 API Connection</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Status:</span>
                <span className="text-white font-mono">{apiStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Response:</span>
                <span className="text-white font-mono">{apiMessage || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Endpoint:</span>
                <span className="text-white/50 font-mono text-sm">
                  {import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-24 text-center">
          <h3 className="text-white/50 text-sm font-semibold mb-6">BUILT WITH</h3>
          <div className="flex flex-wrap justify-center gap-6">
            <TechBadge name="React" />
            <TechBadge name="Vite" />
            <TechBadge name="Tailwind CSS" />
            <TechBadge name="Express" />
            <TechBadge name="Vercel" />
            <TechBadge name="Railway" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/50 text-sm">
            Built with ❤️ using the Fullstack Starter Template
          </p>
          <p className="text-white/30 text-xs mt-2">
            Reference: knockout-merch/COMPLETE_TECHNICAL_DOCUMENTATION.md
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all transform hover:scale-105">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-white/70">{description}</p>
    </div>
  );
}

function TechBadge({ name }) {
  return (
    <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-semibold border border-white/20">
      {name}
    </div>
  );
}

export default App;
