import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function CharacterCreation({ user, onComplete }: { user: any, onComplete: (user: any) => void }) {
  const [races, setRaces] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [elements, setElements] = useState<any[]>([]);

  const [selectedRace, setSelectedRace] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const [rRes, cRes, eRes] = await Promise.all([
          fetch('/config/races.json'),
          fetch('/config/classes.json'),
          fetch('/config/elements.json')
        ]);
        setRaces(await rRes.json());
        setClasses(await cRes.json());
        setElements(await eRes.json());
      } catch (err) {
        console.error('Failed to load configs', err);
        setError('Failed to load game configuration files.');
      }
    };
    loadConfigs();
  }, []);

  const handleCreate = async () => {
    if (!selectedRace || !selectedClass || !selectedElement) {
      setError('Please select a race, class, and element.');
      return;
    }

    setLoading(true);
    setError('');

    const raceData = races.find(r => r.id === selectedRace);
    const classData = classes.find(c => c.id === selectedClass);

    const baseStats = {
      str: 10 + (raceData?.bonus_stat?.str || 0),
      agi: 10 + (raceData?.bonus_stat?.agi || 0),
      int: 10 + (raceData?.bonus_stat?.int || 0),
      def: 10 + (raceData?.bonus_stat?.def || 0),
      luck: 10 + (raceData?.bonus_stat?.luck || 0),
    };

    const character = {
      ras: raceData?.nama || 'Unknown',
      class: classData?.nama || 'Unknown',
      element: elements.find(e => e.id === selectedElement)?.nama || 'Unknown',
      level: 1,
      exp: 0,
      hp: 100 + (baseStats.def * 5),
      max_hp: 100 + (baseStats.def * 5),
      mp: 50 + (baseStats.int * 2),
      max_mp: 50 + (baseStats.int * 2),
      stats: baseStats,
      skills: [...(raceData?.skill_bawaan || []), ...(classData?.skill_list?.slice(0, 1) || [])],
      inventory: [
        { name: 'Rations', rank: 'F', buyPrice: 10, sellPrice: 5 },
        { name: 'Water Flask', rank: 'F', buyPrice: 5, sellPrice: 2 }
      ],
      gold: 100,
      guild: 'None',
      location: 'Kerajaan Oakhaven',
      rank: 'F',
      title: 'Novice',
      titles: [{ name: 'Novice', effect: 'None' }]
    };

    const newUserDoc: any = {
      uid: user.uid,
      username: user.username || 'unknown',
      display_name: user.display_name || 'Unknown Player',
      character,
      needsCharacter: false,
      online: true
    };

    if (user.createdAt) {
      newUserDoc.createdAt = user.createdAt;
    } else {
      newUserDoc.createdAt = serverTimestamp();
    }

    try {
      await setDoc(doc(db, 'users', user.uid), newUserDoc, { merge: true });
      onComplete(newUserDoc);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create character.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex flex-col items-center">
      <h1 className="text-4xl font-serif font-bold text-amber-500 mb-2">Create Your Character</h1>
      <p className="text-zinc-400 mb-8">Welcome, {user.display_name}. Forge your destiny.</p>

      {error && <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-6 w-full max-w-2xl">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        {/* Race Selection */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h2 className="text-xl font-bold mb-4 text-amber-400 border-b border-zinc-800 pb-2">Race</h2>
          <div className="space-y-3">
            {races.map(r => (
              <div 
                key={r.id}
                onClick={() => setSelectedRace(r.id)}
                className={`p-3 rounded cursor-pointer border transition-colors ${selectedRace === r.id ? 'bg-amber-900/30 border-amber-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'}`}
              >
                <h3 className="font-bold">{r.nama}</h3>
                <p className="text-xs text-zinc-400 mt-1">{r.deskripsi}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Class Selection */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h2 className="text-xl font-bold mb-4 text-amber-400 border-b border-zinc-800 pb-2">Class</h2>
          <div className="space-y-3">
            {classes.map(c => (
              <div 
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={`p-3 rounded cursor-pointer border transition-colors ${selectedClass === c.id ? 'bg-amber-900/30 border-amber-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'}`}
              >
                <h3 className="font-bold">{c.nama}</h3>
                <p className="text-xs text-zinc-400 mt-1">{c.deskripsi}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Element Selection */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h2 className="text-xl font-bold mb-4 text-amber-400 border-b border-zinc-800 pb-2">Element</h2>
          <div className="space-y-3">
            {elements.map(e => (
              <div 
                key={e.id}
                onClick={() => setSelectedElement(e.id)}
                className={`p-3 rounded cursor-pointer border transition-colors ${selectedElement === e.id ? 'bg-amber-900/30 border-amber-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'}`}
              >
                <h3 className="font-bold">{e.nama}</h3>
                <p className="text-xs text-zinc-400 mt-1">{e.efek_khusus}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleCreate}
        disabled={loading || !selectedRace || !selectedClass || !selectedElement}
        className="mt-12 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-12 rounded-full text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/20"
      >
        {loading ? 'Forging...' : 'Enter the World'}
      </button>
    </div>
  );
}
