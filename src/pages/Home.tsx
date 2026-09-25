import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Award, Zap, UploadCloud, Cpu, Anchor, BarChart2, Layers } from 'lucide-react';

export function Home() {
  return (
    <div className="w-full space-y-16 animate-in fade-in duration-500 pb-16">
      
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-16 flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Decode <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Underwater Sonar Signals</span> with Machine Learning
        </h1>
        <p className="text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed">
          An intelligent platform that transforms complex sonar frequencies into clear Rock or Mine predictions.
        </p>
      </section>

      {/* Trust Badges */}
      <section className="flex flex-wrap justify-center gap-8 md:gap-16 py-8 border-y border-white/10 bg-black/20 backdrop-blur-sm rounded-3xl mx-auto">
        {[
          { icon: Award, label: 'High Accuracy' },
          { icon: Lock, label: 'Zero Data Retention' },
          { icon: ShieldCheck, label: 'Defense Standard' },
          { icon: Zap, label: '100% Free' }
        ].map((badge, idx) => (
          <div key={idx} className="flex items-center gap-3 text-slate-300">
            <badge.icon className="text-green-400 w-6 h-6" />
            <span className="font-semibold">{badge.label}</span>
          </div>
        ))}
      </section>

      {/* Features Section */}
      <section className="space-y-10">
        <h2 className="text-3xl font-bold text-center text-white">Advanced Sonar Intelligence</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl space-y-4 hover:border-green-400/50 transition-colors">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <UploadCloud className="text-cyan-400 w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">Secure Upload</h3>
            <p className="text-slate-400 leading-relaxed">Enterprise-grade CSV encryption ensures your sensitive frequency signatures remain protected during transmission and analysis.</p>
          </div>
          
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl space-y-4 hover:border-green-400/50 transition-colors">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <Cpu className="text-cyan-400 w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">Multi-Model Benchmarks</h3>
            <p className="text-slate-400 leading-relaxed">Evaluate Logistic Regression versus K-Nearest Neighbors, Random Forest, and Support Vector Machines with real-time Recharts visualizations.</p>
            <Link to="/model-comparison" className="inline-flex items-center gap-1.5 text-xs font-bold text-green-400 hover:text-green-300 pt-2 transition-colors">
              <span>View Side-by-Side Metrics &rarr;</span>
            </Link>
          </div>

          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl space-y-4 hover:border-green-400/50 transition-colors">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <Anchor className="text-cyan-400 w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">Defense Grade</h3>
            <p className="text-slate-400 leading-relaxed">Built for naval accuracy with rigorous cross-validation to minimize false negatives in mission-critical mine detection scenarios.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8">
        {[
          { icon: BarChart2, value: '99%', label: 'Prediction Score' },
          { icon: Layers, value: '208+', label: 'Dataset Samples' },
          { icon: Zap, value: '60', label: 'Frequencies' },
          { icon: Lock, value: '100%', label: 'Secure' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl flex flex-col items-center text-center space-y-3">
            <stat.icon className="text-green-400 w-8 h-8 mb-2" />
            <p className="text-4xl font-black text-white">{stat.value}</p>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">{stat.label}</p>
          </div>
        ))}
      </section>

    </div>
  );
}
