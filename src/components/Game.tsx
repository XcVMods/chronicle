import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { processPlayerAction } from '../lib/gameMaster';
import { LogOut, Send, User, Shield, Zap, Heart, MapPin, Star, Map as MapIcon, MessageSquare, Users2, Swords, Handshake, Info, Wrench } from 'lucide-react';

export const mapLocations = [
  { 
    name: 'Kerajaan Oakhaven', 
    desc: 'Kerajaan awal yang damai dan makmur.', 
    type: 'safezone',
    lore: 'Didirikan oleh pahlawan legendaris berabad-abad lalu, Oakhaven menjadi pusat perdagangan dan titik awal para petualang baru. Dilindungi oleh penghalang magis dari pohon Oak raksasa di tengah kota.',
    atmosphere: 'Sejuk, damai, dengan aroma daun segar dan roti panggang. Suara burung berkicau dan keramaian pasar yang ramah.'
  },
  { 
    name: 'Kekaisaran Draconia', 
    desc: 'Kekaisaran militeristik yang diperintah oleh naga.', 
    type: 'danger',
    lore: 'Bangsa yang memuja naga sebagai dewa. Pasukan mereka tak tertandingi, dan langit mereka selalu dipenuhi oleh naga yang berpatroli. Hanya yang kuat yang dihormati di sini.',
    atmosphere: 'Gemuruh kepakan sayap raksasa, udara yang sangat panas dan kering, serta bau belerang yang menyengat.'
  },
  { 
    name: 'Republik Aethelgard', 
    desc: 'Negara para cendekiawan dan sihir.', 
    type: 'explore',
    lore: 'Dibangun di atas reruntuhan peradaban kuno, Aethelgard menyimpan perpustakaan terbesar di dunia. Para penyihir dan peneliti berkumpul di sini untuk memecahkan misteri alam semesta.',
    atmosphere: 'Tenang, dipenuhi pendaran cahaya kristal biru, udara beraroma perkamen tua dan ozon dari sisa sihir.'
  },
  { 
    name: 'Federasi Besi', 
    desc: 'Negara industri yang dipenuhi mesin dan uap.', 
    type: 'combat',
    lore: 'Menolak sihir tradisional, Federasi Besi mengandalkan teknologi uap dan mesin mekanik. Kota-kota mereka dipenuhi cerobong asap dan kereta uap yang melintasi benua.',
    atmosphere: 'Bising oleh suara roda gigi dan mesin uap, langit tertutup kabut asap tipis, berbau oli dan besi berkarat.'
  },
  { 
    name: 'Aliansi Hutan Sylvana', 
    desc: 'Hutan luas yang dilindungi oleh peri dan roh.', 
    type: 'explore',
    lore: 'Hutan purba yang hidup. Pohon-pohonnya bisa berbicara dan roh alam menjaga setiap sudutnya. Mereka sangat tertutup dari dunia luar dan membenci perusak alam.',
    atmosphere: 'Lembap, mistis, diterangi cahaya kunang-kunang raksasa. Suara bisikan angin dan nyanyian peri terdengar sayup-sayup.'
  },
  { 
    name: 'Kesultanan Pasir Emas', 
    desc: 'Negara gurun kaya yang dibangun di atas perdagangan.', 
    type: 'safezone',
    lore: 'Terletak di tengah gurun mematikan, kesultanan ini menguasai oasis terbesar dan rute perdagangan utama. Istana mereka berlapis emas dan menyimpan harta karun tak ternilai.',
    atmosphere: 'Sangat terik di siang hari dan dingin menggigit di malam hari. Udara dipenuhi aroma rempah-rempah eksotis dan debu pasir.'
  },
  { 
    name: 'Kepulauan Mutiara', 
    desc: 'Kepulauan tersebar yang dihuni bajak laut dan monster laut.', 
    type: 'combat',
    lore: 'Kumpulan ribuan pulau tanpa hukum yang jelas. Tempat pelarian para buronan, pemburu harta karun, dan sarang monster laut raksasa seperti Kraken.',
    atmosphere: 'Berangin kencang, aroma garam laut yang pekat, deburan ombak keras, dan nyanyian pelaut dari kedai-kedai pinggir pantai.'
  },
  { 
    name: 'Dataran Es Niflheim', 
    desc: 'Padang gurun beku di mana hanya yang kuat yang bertahan hidup.', 
    type: 'danger',
    lore: 'Tanah yang dikutuk dengan musim dingin abadi. Dihuni oleh suku-suku barbar, raksasa es, dan binatang buas yang bermutasi karena hawa dingin ekstrem.',
    atmosphere: 'Beku, sunyi, dengan badai salju yang membutakan. Udara sangat dingin hingga menusuk tulang.'
  },
  { 
    name: 'Kerajaan Bawah Tanah Khazad', 
    desc: 'Alam bawah tanah para kurcaci dan kengerian dari kedalaman.', 
    type: 'explore',
    lore: 'Jaringan gua dan kota bawah tanah yang membentang di bawah benua. Terkenal dengan tambang permata dan pandai besinya, namun semakin dalam digali, semakin banyak kengerian kuno yang terbangun.',
    atmosphere: 'Gelap, bergema dengan suara palu godam, udara pengap berdebu dengan sesekali hawa panas dari aliran lava bawah tanah.'
  },
  { 
    name: 'Tanah Suci Celestia', 
    desc: 'Benua melayang tempat para makhluk suci dan ujian pamungkas berada.', 
    type: 'boss',
    lore: 'Tempat tinggal para entitas suci dan malaikat. Hanya mereka yang telah membuktikan kelayakannya yang dapat menginjakkan kaki di sini untuk menghadapi ujian terakhir.',
    atmosphere: 'Terang benderang oleh cahaya suci yang tidak menyilaukan, udara terasa sangat ringan dan murni, diiringi paduan suara surgawi yang samar.'
  }
];

export default function Game({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('story'); // 'story', 'map', 'players', 'character', 'guilds'
  const [stories, setStories] = useState<any[]>([]);
  const [worldState, setWorldState] = useState<any>({ quests: [], merchantStock: [] });
  const [players, setPlayers] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [character, setCharacter] = useState(user.character);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen to World Story
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setStories(newStories);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    // Listen to Character Updates
    const charUnsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setCharacter(docSnap.data().character);
      }
    });

    // Listen to Players List
    const pQuery = query(collection(db, 'users'), limit(100));
    const pUnsub = onSnapshot(pQuery, (snapshot) => {
      const newPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(newPlayers);
    });

    // Listen to World State
    const wsUnsub = onSnapshot(doc(db, 'world_state', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setWorldState(docSnap.data());
      } else {
        // Initialize if not exists
        setDoc(doc(db, 'world_state', 'global'), {
          quests: [
            { name: 'Goblin Subjugation', rank: 'F', description: 'Defeat 5 Goblins in the nearby forest.' },
            { name: 'Herb Gathering', rank: 'F', description: 'Collect 10 medicinal herbs.' },
            { name: 'Escort the Merchant', rank: 'E', description: 'Protect a merchant traveling to the next town.' }
          ],
          merchantStock: [
            { name: 'Health Potion', rank: 'F', buyPrice: 15, sellPrice: 5, stock: 10 },
            { name: 'Mana Potion', rank: 'F', buyPrice: 20, sellPrice: 8, stock: 5 },
            { name: 'Iron Sword', rank: 'E', buyPrice: 150, sellPrice: 50, stock: 2 }
          ]
        });
      }
    });

    // Set online status
    updateDoc(doc(db, 'users', user.uid), { 
      online: true,
      ...(auth.currentUser?.email === 'xcvmods@developer.com' ? { role: 'dev' } : {})
    });

    return () => {
      unsubscribe();
      charUnsub();
      pUnsub();
      wsUnsub();
      updateDoc(doc(db, 'users', user.uid), { online: false });
    };
  }, [user.uid]);

  const isDev = auth.currentUser?.email === 'xcvmods@developer.com';
  const [devStats, setDevStats] = useState(character.stats);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    // Check if key is actually a valid-looking string (not just placeholder or undefined)
    if (!key || key === 'undefined' || key === 'null' || key.length < 10) {
      setApiKeyMissing(true);
    } else {
      setApiKeyMissing(false);
    }
  }, []);

  useEffect(() => {
    setDevStats(character.stats);
  }, [character.stats]);

  const handleHealFull = async () => {
    const updated = { ...character, hp: character.max_hp, mp: character.max_mp };
    await updateDoc(doc(db, 'users', user.uid), { character: updated });
    alert('Healed to full!');
  };

  const handleAddExp = async () => {
    const updated = { ...character, exp: character.exp + 1000 };
    await updateDoc(doc(db, 'users', user.uid), { character: updated });
    alert('Added 1000 EXP!');
  };

  const handleLevelUp = async () => {
    const updated = { 
      ...character, 
      level: character.level + 1, 
      max_hp: character.max_hp + 50, 
      max_mp: character.max_mp + 20, 
      hp: character.max_hp + 50, 
      mp: character.max_mp + 20 
    };
    await updateDoc(doc(db, 'users', user.uid), { character: updated });
    alert('Leveled up!');
  };

  const handleStatChange = (stat: string, value: number) => {
    setDevStats((prev: any) => ({ ...prev, [stat]: value }));
  };

  const saveStats = async () => {
    const updated = { ...character, stats: devStats };
    await updateDoc(doc(db, 'users', user.uid), { character: updated });
    alert('Stats saved!');
  };

  const getLevelAndRank = (exp: number) => {
    if (exp < 20) return { level: 1, rank: 'F' };
    if (exp < 120) return { level: 2, rank: 'E' }; // 20 + 100
    if (exp < 620) return { level: 3, rank: 'D' }; // 120 + 500
    if (exp < 3120) return { level: 4, rank: 'C' }; // 620 + 2500
    if (exp < 15620) return { level: 5, rank: 'B' }; // 3120 + 12500
    if (exp < 78120) return { level: 6, rank: 'A' }; // 15620 + 62500
    return { level: 7, rank: 'S' };
  };

  const handleAction = async (actionText: string) => {
    if (!actionText.trim() || loading) return;
    
    setLoading(true);
    setInput('');
    setActiveTab('story'); // Switch to story tab if action is taken from map

    try {
      // 1. Call AI Game Master
      const recentContext = stories.slice(-5).map(s => `[${s.display_name} @ ${s.lokasi}]: ${s.isi_diperkaya_gm}`);
      
      const currentLocationDetails = mapLocations.find(l => l.name === character.location);
      const enhancedWorldState = {
        ...worldState,
        current_location_lore: currentLocationDetails?.lore,
        current_location_atmosphere: currentLocationDetails?.atmosphere
      };

      const gmResponse = await processPlayerAction(actionText, character, recentContext, {}, enhancedWorldState);

      // 2. Update Character Stats
      const newExp = character.exp + (gmResponse.mekanik.exp_gained || 0);
      const { level: newLevel, rank: newRank } = getLevelAndRank(newExp);
      
      let maxHp = character.max_hp;
      let maxMp = character.max_mp;
      if (newLevel > character.level) {
        const levelDiff = newLevel - character.level;
        maxHp += levelDiff * 50;
        maxMp += levelDiff * 20;
      }
      
      const newHp = Math.max(0, Math.min(maxHp, character.hp + (gmResponse.mekanik.hp_change || 0)));
      const newMp = Math.max(0, Math.min(maxMp, character.mp + (gmResponse.mekanik.mp_change || 0)));
      const newLocation = gmResponse.mekanik.location_change || character.location;
      const newGold = (character.gold || 0) + (gmResponse.mekanik.gold_change || 0);

      let newTitle = character.title || 'Novice';
      let newTitlesList = character.titles || [{ name: 'Novice', effect: 'None' }];
      if (gmResponse.mekanik.new_title && gmResponse.mekanik.new_title.name) {
        newTitle = gmResponse.mekanik.new_title.name;
        // Check if title already exists
        if (!newTitlesList.find((t: any) => t.name === newTitle)) {
          newTitlesList.push(gmResponse.mekanik.new_title);
        }
      }

      // Handle legacy string items in inventory
      const currentInventory = (character.inventory || []).map((item: any) => {
        if (typeof item === 'string') return { name: item, rank: 'F', buyPrice: 10, sellPrice: 5 };
        return item;
      });

      const gainedItems = (gmResponse.mekanik.items_gained || []).map((item: any) => {
        if (typeof item === 'string') return { name: item, rank: 'F', buyPrice: 10, sellPrice: 5 };
        return item;
      });

      const itemsLost = gmResponse.mekanik.items_lost || [];
      let finalInventory = [...currentInventory, ...gainedItems];
      
      if (itemsLost.length > 0) {
        itemsLost.forEach((lostItemName: string) => {
          const index = finalInventory.findIndex(item => item.name === lostItemName);
          if (index !== -1) {
            finalInventory.splice(index, 1);
          }
        });
      }

      const updatedCharacter = {
        ...character,
        hp: newHp,
        mp: newMp,
        max_hp: maxHp,
        max_mp: maxMp,
        level: newLevel,
        exp: newExp,
        gold: newGold,
        location: newLocation,
        rank: newRank,
        title: newTitle,
        titles: newTitlesList,
        guild: gmResponse.mekanik.guild_joined || character.guild,
        inventory: finalInventory
      };

      await updateDoc(doc(db, 'users', user.uid), {
        character: updatedCharacter
      });

      // 3. Save Story Entry
      await addDoc(collection(db, 'stories'), {
        entry_id: `story_${Date.now()}`,
        tanggal_in_game: `Hari ke-${Math.floor(Date.now() / 86400000) % 365}`,
        author_uid: user.uid,
        author_username: user.username,
        display_name: user.display_name,
        lokasi: newLocation,
        judul: `Aksi di ${newLocation}`,
        isi_asli_player: actionText,
        isi_diperkaya_gm: gmResponse.narasi,
        dampak_dunia: gmResponse.dunia_bereaksi,
        tag: gmResponse.tags || [],
        pilihan_selanjutnya: gmResponse.pilihan_selanjutnya || [],
        createdAt: serverTimestamp()
      });

      // 4. Update World State if needed
      if (gmResponse.mekanik.updated_quests || gmResponse.mekanik.updated_merchant_stock) {
        const updates: any = {};
        if (gmResponse.mekanik.updated_quests) updates.quests = gmResponse.mekanik.updated_quests;
        if (gmResponse.mekanik.updated_merchant_stock) updates.merchantStock = gmResponse.mekanik.updated_merchant_stock;
        await setDoc(doc(db, 'world_state', 'global'), updates, { merge: true });
      }

    } catch (err: any) {
      console.error("Action failed:", err);
      let errorMsg = "Unknown error";
      if (typeof err === 'string') {
        errorMsg = err;
      } else if (err && err.message) {
        errorMsg = err.message;
      }
      alert(`The Game Master is currently unavailable: ${errorMsg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerInteraction = (targetPlayer: any, actionType: string) => {
    handleAction(`I approach ${targetPlayer.display_name} and request a ${actionType}.`);
  };

  const handleSpawnDummy = async () => {
    try {
      await setDoc(doc(db, 'users', 'dummy_player_1'), {
        uid: 'dummy_player_1',
        username: 'dummy_tester',
        display_name: 'Dummy Tester',
        online: true,
        needsCharacter: false,
        createdAt: serverTimestamp(),
        character: {
          ras: 'Orc',
          class: 'Warrior',
          element: 'Api',
          level: 5,
          exp: 0,
          hp: 250,
          max_hp: 250,
          mp: 50,
          max_mp: 50,
          stats: { str: 20, agi: 10, int: 5, def: 15, luck: 5 },
          skills: ['Power Strike', 'Bloodlust'],
          inventory: ['Dummy Sword'],
          location: character.location,
          rank: 'E',
          title: 'Test Dummy',
          titles: [{ name: 'Test Dummy', effect: 'Takes hits' }]
        }
      });
      alert('Dummy Player spawned successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to spawn dummy.');
    }
  };

  const handleRemoveDummy = async () => {
    try {
      await deleteDoc(doc(db, 'users', 'dummy_player_1'));
      alert('Dummy Player removed successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to remove dummy.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-zinc-900 flex items-center px-4 bg-zinc-950/90 backdrop-blur-sm z-20 shrink-0">
        <h1 className="text-lg font-serif font-bold text-amber-500">World Chronicle</h1>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            Live
          </div>
          <button onClick={onLogout} className="text-zinc-500 hover:text-red-400 p-1">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* STORY TAB */}
        <div className={`absolute inset-0 flex flex-col ${activeTab === 'story' ? 'z-10 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-6 scroll-smooth">
            {stories.length === 0 ? (
              <div className="text-center text-zinc-500 italic mt-20">The chronicles are empty. Begin your journey...</div>
            ) : (
              stories.map((story) => (
                <div key={story.id} className={`flex flex-col max-w-3xl ${story.author_uid === user.uid ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-amber-500 text-sm">{story.display_name}</span>
                    <span className="text-xs text-zinc-500">@ {story.lokasi}</span>
                  </div>
                  <div className={`p-4 rounded-xl text-sm leading-relaxed ${story.author_uid === user.uid ? 'bg-zinc-900 border border-zinc-800 text-zinc-300' : 'bg-zinc-900/50 border border-zinc-800/50 text-zinc-400'}`}>
                    <div className="mb-2 pb-2 border-b border-zinc-800/50 italic text-zinc-500">"{story.isi_asli_player}"</div>
                    <div className="font-serif text-zinc-200 text-base">{story.isi_diperkaya_gm}</div>
                    {story.dampak_dunia && (
                      <div className="mt-3 pt-2 border-t border-zinc-800/50 text-amber-600/80 text-xs font-bold uppercase tracking-wider">
                        [World Reaction] {story.dampak_dunia}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-10 pb-4 px-4">
            <div className="max-w-4xl mx-auto">
              {apiKeyMissing && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg mb-4 flex items-center gap-3">
                  <Info size={16} className="shrink-0" />
                  <div>
                    <p className="font-bold">Game Master Offline</p>
                    <p className="opacity-80">Gemini API Key is missing. Please set GEMINI_API_KEY in Settings to enable the Game Master.</p>
                  </div>
                </div>
              )}
              {stories.length > 0 && stories[stories.length - 1].author_uid === user.uid && stories[stories.length - 1].pilihan_selanjutnya?.length > 0 && (
                <div className="flex overflow-x-auto pb-2 mb-2 gap-2 scrollbar-hide">
                  {stories[stories.length - 1].pilihan_selanjutnya.map((opt: string, i: number) => (
                    <button 
                      key={i} onClick={() => handleAction(opt)} disabled={loading}
                      className="whitespace-nowrap text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-full transition-colors disabled:opacity-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); handleAction(input); }} className="flex gap-2">
                <input
                  type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="What do you do next?"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 text-zinc-100 placeholder-zinc-500"
                  disabled={loading}
                />
                <button type="submit" disabled={loading || !input.trim()} className="bg-amber-600 hover:bg-amber-500 text-white px-5 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 min-h-[44px]">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* MAP TAB */}
        <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 ${activeTab === 'map' ? 'z-10 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          <h2 className="text-xl font-serif font-bold text-amber-500 mb-4 flex items-center gap-2"><MapIcon size={20}/> World Map</h2>
          <div className="grid gap-3">
            {mapLocations.map((loc, i) => (
              <div key={i} className={`p-4 rounded-xl border ${character.location === loc.name ? 'bg-amber-900/20 border-amber-500/50' : 'bg-zinc-900 border-zinc-800'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-zinc-100">{loc.name}</h3>
                  {character.location === loc.name && <span className="text-[10px] bg-amber-500 text-zinc-950 px-2 py-0.5 rounded-full font-bold uppercase">You are here</span>}
                </div>
                <p className="text-xs text-zinc-400 mb-2">{loc.desc}</p>
                <div className="mb-4 space-y-1">
                  <p className="text-[11px] text-zinc-500"><strong className="text-zinc-300">Lore:</strong> {loc.lore}</p>
                  <p className="text-[11px] text-zinc-500"><strong className="text-zinc-300">Atmosphere:</strong> {loc.atmosphere}</p>
                </div>
                <div className="flex gap-2">
                  {character.location !== loc.name ? (
                    <button onClick={() => handleAction(`I travel to ${loc.name}`)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg flex-1 min-h-[44px]">Travel Here</button>
                  ) : (
                    <button onClick={() => handleAction(`I explore around ${loc.name} looking for events.`)} className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-600/30 px-4 py-2 rounded-lg flex-1 min-h-[44px]">Explore Area</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PLAYERS TAB */}
        <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 ${activeTab === 'players' ? 'z-10 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          <h2 className="text-xl font-serif font-bold text-amber-500 mb-4 flex items-center gap-2"><Users2 size={20}/> Realm Inhabitants</h2>
          <div className="grid gap-3">
            {players.filter(p => p.role !== 'dev').map((p) => (
              <div key={p.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-amber-500 font-serif font-bold text-lg">
                        {p.character?.rank || 'F'}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900 ${p.online ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                        {p.display_name} 
                        {p.id === user.uid && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">You</span>}
                      </h3>
                      <p className="text-xs text-zinc-400">Lvl {p.character?.level || 1} • {p.character?.title || 'Novice'}</p>
                    </div>
                  </div>
                </div>
                {p.id !== user.uid && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                    <button onClick={() => handlePlayerInteraction(p, 'duel')} className="flex-1 flex items-center justify-center gap-1 text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 py-2 rounded-lg min-h-[44px]">
                      <Swords size={14}/> Duel
                    </button>
                    <button onClick={() => handlePlayerInteraction(p, 'party invite')} className="flex-1 flex items-center justify-center gap-1 text-xs bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 py-2 rounded-lg min-h-[44px]">
                      <Handshake size={14}/> Party
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CHARACTER TAB */}
        <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 ${activeTab === 'character' ? 'z-10 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden mb-4">
            <div className="bg-zinc-800/50 p-6 text-center border-b border-zinc-800 relative">
              <div className="absolute top-4 right-4 w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col items-center justify-center">
                <span className="text-[10px] text-amber-500/70 uppercase font-bold leading-none">Rank</span>
                <span className="text-2xl font-serif font-bold text-amber-500 leading-none">{character.rank || 'F'}</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-zinc-100">{user.display_name}</h2>
              <p className="text-sm text-amber-500 font-medium mb-1">&lt;{character.title || 'Novice'}&gt;</p>
              <p className="text-xs text-zinc-400">Lvl {character.level} {character.ras} {character.class}</p>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Vitals */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col items-center justify-center">
                    <span className="text-xs text-zinc-500 uppercase font-bold mb-1">Gold</span>
                    <span className="text-amber-400 font-bold flex items-center gap-1"><Star size={14}/> {character.gold || 0}</span>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col items-center justify-center">
                    <span className="text-xs text-zinc-500 uppercase font-bold mb-1">Guild</span>
                    <span className="text-zinc-200 font-bold">{character.guild || 'None'}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-red-400 flex items-center gap-1"><Heart size={12}/> HP</span><span>{character.hp} / {character.max_hp}</span></div>
                  <div className="h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-red-500 transition-all" style={{ width: `${(character.hp / character.max_hp) * 100}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-blue-400 flex items-center gap-1"><Zap size={12}/> MP</span><span>{character.mp} / {character.max_mp}</span></div>
                  <div className="h-2 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${(character.mp / character.max_mp) * 100}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-amber-400 flex items-center gap-1"><Star size={12}/> EXP</span><span>{character.exp}</span></div>
                  <div className="h-1 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all" style={{ width: `${(character.exp % 1000) / 10}%` }}></div></div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Attributes</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {['str', 'agi', 'int', 'def', 'luck'].map(stat => (
                    <div key={stat} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
                      <span className="text-zinc-500 uppercase text-xs font-bold">{stat}</span>
                      <span className="font-mono text-zinc-200">{character.stats[stat]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Titles */}
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Earned Titles</h3>
                <div className="space-y-2">
                  {(character.titles || [{name: character.title || 'Novice', effect: 'None'}]).map((t: any, i: number) => (
                    <div key={i} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col">
                      <span className="text-amber-500 text-sm font-bold">{t.name}</span>
                      <span className="text-xs text-zinc-500">{t.effect}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inventory */}
              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Inventory</h3>
                <div className="flex flex-wrap gap-2">
                  {(character.inventory || []).map((item: any, i: number) => {
                    const itemName = typeof item === 'string' ? item : item.name;
                    const itemRank = typeof item === 'string' ? 'F' : (item.rank || 'F');
                    return (
                      <span key={i} className="text-xs bg-zinc-950 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
                        {itemName} <span className="text-[10px] text-zinc-500">[{itemRank}]</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-6 mt-6 border-t border-zinc-800">
                <button onClick={onLogout} className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                  <LogOut size={18} />
                  Logout from World Chronicle
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* GUILDS TAB */}
        <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 ${activeTab === 'guilds' ? 'z-10 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          <h2 className="text-xl font-serif font-bold text-amber-500 mb-4 flex items-center gap-2"><Shield size={20}/> Guilds</h2>
          
          <div className="space-y-6">
            {/* Adventurer's Guild */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-800/50 p-4 border-b border-zinc-800">
                <h3 className="font-bold text-zinc-100 text-lg">Adventurer's Guild</h3>
                <p className="text-xs text-zinc-400">Take quests, earn EXP, and rank up.</p>
              </div>
              <div className="p-4">
                {character.guild !== 'Adventurer' ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-zinc-400 mb-4">You are not affiliated with the Adventurer's Guild.</p>
                    <button onClick={() => handleAction("I register at the Adventurer's Guild.")} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg text-sm font-bold">
                      Register Now
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-zinc-400">Your Rank: <strong className="text-amber-500">{character.rank}</strong></span>
                      <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-1 rounded">Affiliated</span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Quest Board</h4>
                    <div className="space-y-2">
                      {(worldState.quests || []).map((quest: any, i: number) => (
                        <div key={i} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-zinc-200">{quest.name}</div>
                            <div className="text-xs text-zinc-500">Rank {quest.rank} Quest</div>
                            {quest.description && <div className="text-xs text-zinc-400 mt-1">{quest.description}</div>}
                          </div>
                          <button onClick={() => handleAction(`I take the quest: ${quest.name}`)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-500 px-3 py-1.5 rounded">
                            Accept
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Merchant's Guild */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-zinc-100 text-lg">Merchant's Guild</h3>
                  <p className="text-xs text-zinc-400">Buy and sell items.</p>
                </div>
                <div className="text-amber-400 font-bold flex items-center gap-1">
                  <Star size={14} /> {character.gold || 0} G
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Today's Stock</h4>
                <div className="space-y-2 mb-6">
                  {(worldState.merchantStock || []).map((item: any, i: number) => (
                    <div key={i} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-zinc-200">{item.name}</div>
                        <div className="text-xs text-zinc-500">Rank {item.rank} | Stock: {item.stock}</div>
                      </div>
                      <button onClick={() => handleAction(`I buy the ${item.name} from the Merchant's Guild.`)} className="text-xs bg-amber-900/30 hover:bg-amber-900/50 text-amber-500 border border-amber-800/50 px-3 py-1.5 rounded flex items-center gap-1">
                        {item.buyPrice} G
                      </button>
                    </div>
                  ))}
                </div>

                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Sell Items</h4>
                <div className="space-y-2">
                  {character.inventory && character.inventory.length > 0 ? (
                    character.inventory.map((item: any, i: number) => {
                      const itemName = typeof item === 'string' ? item : item.name;
                      const sellPrice = typeof item === 'string' ? 5 : (item.sellPrice || 5);
                      const itemRank = typeof item === 'string' ? 'F' : (item.rank || 'F');
                      return (
                        <div key={i} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-zinc-200">{itemName}</div>
                            <div className="text-xs text-zinc-500">Rank {itemRank}</div>
                          </div>
                          <button onClick={() => handleAction(`I sell my ${itemName} to the Merchant's Guild.`)} className="text-xs bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-500 border border-emerald-800/50 px-3 py-1.5 rounded flex items-center gap-1">
                            +{sellPrice} G
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-500 text-center py-2">Your inventory is empty.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DEV TAB */}
        {isDev && (
          <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 ${activeTab === 'dev' ? 'z-10 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
            <h2 className="text-xl font-serif font-bold text-emerald-500 mb-4 flex items-center gap-2"><Wrench size={20}/> Developer Tools</h2>
            
            <div className="space-y-6">
              {/* Dummy Controls */}
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-zinc-100 mb-3">Dummy Controls</h3>
                <div className="flex gap-2">
                  <button onClick={handleSpawnDummy} className="flex-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800 py-2 rounded-lg text-xs font-bold">
                    + Spawn Dummy
                  </button>
                  <button onClick={handleRemoveDummy} className="flex-1 bg-red-900/30 text-red-400 border border-red-800 py-2 rounded-lg text-xs font-bold">
                    - Remove Dummy
                  </button>
                </div>
              </div>

              {/* Character Cheats */}
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-zinc-100 mb-3">Character Cheats</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleHealFull} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-xs font-bold">
                    Heal Full HP/MP
                  </button>
                  <button onClick={handleAddExp} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-xs font-bold">
                    +1000 EXP
                  </button>
                  <button onClick={handleLevelUp} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-xs font-bold">
                    Level Up
                  </button>
                </div>
              </div>

              {/* Edit Stats */}
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-zinc-100 mb-3">Edit Stats</h3>
                <div className="space-y-3">
                  {['str', 'agi', 'int', 'def', 'luck'].map(stat => (
                    <div key={stat} className="flex items-center gap-3">
                      <span className="w-12 text-xs font-bold uppercase text-zinc-400">{stat}</span>
                      <input 
                        type="number" 
                        value={devStats[stat] || 0} 
                        onChange={(e) => handleStatChange(stat, parseInt(e.target.value) || 0)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm focus:border-amber-500 focus:outline-none text-zinc-100"
                      />
                    </div>
                  ))}
                  <button onClick={saveStats} className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 py-2 rounded-lg text-sm font-bold mt-2">
                    Save Stats
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="h-16 bg-zinc-950 border-t border-zinc-900 flex items-center justify-around px-2 shrink-0 pb-safe z-20">
        <button onClick={() => setActiveTab('story')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'story' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <MessageSquare size={20} />
          <span className="text-[10px] font-medium">Story</span>
        </button>
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'map' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <MapIcon size={20} />
          <span className="text-[10px] font-medium">Map</span>
        </button>
        <button onClick={() => setActiveTab('guilds')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'guilds' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Shield size={20} />
          <span className="text-[10px] font-medium">Guilds</span>
        </button>
        <button onClick={() => setActiveTab('players')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'players' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Users2 size={20} />
          <span className="text-[10px] font-medium">Players</span>
        </button>
        <button onClick={() => setActiveTab('character')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'character' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <User size={20} />
          <span className="text-[10px] font-medium">Character</span>
        </button>
        {isDev && (
          <button onClick={() => setActiveTab('dev')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'dev' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Wrench size={20} />
            <span className="text-[10px] font-medium">Dev</span>
          </button>
        )}
      </div>
    </div>
  );
}
