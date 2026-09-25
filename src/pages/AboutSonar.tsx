import React from 'react';
import { Waves, Map, Target } from 'lucide-react';

export function AboutSonar() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-sm text-slate-500">Knowledge Base</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">About SONAR & Classification</h2>
        </div>
      </header>

      <div className="prose prose-slate prose-invert max-w-none">
        <div className="bg-black/40 backdrop-blur-md p-8 rounded-3xl border border-white/10 space-y-8 hover:border-green-400/50 transition-colors">
          
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-cyan-400">
              <Waves size={28} />
              <h2 className="text-2xl font-bold text-white m-0">Principles of SONAR</h2>
            </div>
            <p className="text-slate-400 leading-relaxed">
              SONAR (Sound Navigation and Ranging) is a technique that uses sound propagation (usually underwater, as in submarine navigation) to navigate, communicate with or detect objects on or under the surface of the water, such as other vessels.
            </p>
            <p className="text-slate-400 leading-relaxed">
              Active sonar creates a pulse of sound, often called a "ping", and then listens for reflections (echo) of the pulse. By analyzing the time it takes for the echo to return and the characteristics of the returned sound wave, we can determine the distance and material properties of the target.
            </p>
          </section>

          <section className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 text-cyan-400">
              <Target size={28} />
              <h2 className="text-2xl font-bold text-white m-0">Rock vs. Mine Signatures</h2>
            </div>
            <p className="text-slate-400 leading-relaxed">
              When a sonar ping hits a metallic cylinder (like a naval mine), the echo has a distinct acoustic signature compared to a ping reflecting off a roughly cylindrical rock.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li><strong className="text-slate-200">Metal Mines:</strong> Tend to have sharper, more uniform frequency responses. The internal structure and metallic casing create specific resonance patterns.</li>
              <li><strong className="text-slate-200">Rocks:</strong> Have irregular, porous surfaces that scatter sound differently, leading to a more complex, noisy, and dampened frequency response across the spectrum.</li>
            </ul>
            <p className="text-slate-400 leading-relaxed">
              The dataset used in this application comprises 60 numbers in the range 0.0 to 1.0. Each number represents the energy within a particular frequency band, integrated over a certain period of time.
            </p>
          </section>

          <section className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 text-cyan-400">
              <Map size={28} />
              <h2 className="text-2xl font-bold text-white m-0">Maritime Applications</h2>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Automated classification using Machine Learning drastically reduces human error in stressful environments. Systems like Echo-Guard can be deployed on Autonomous Underwater Vehicles (AUVs) to map out safe channels, detect unexploded ordnance (UXO), and secure naval routes without risking human divers.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
