import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, setDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { processPlayerAction } from '../lib/gameMaster';
import { GameAlert } from './GameAlert';
import PartyModal from './PartyModal';
import { Equipment } from '../types';
import { LogOut, Send, User, Shield, Zap, Heart, MapPin, Star, Map as MapIcon, MessageSquare, Users2, Swords, Handshake, Info, Wrench, PawPrint, ArrowLeftRight, Users, Flame, Skull, Droplet, Snowflake } from 'lucide-react';

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
  },
  { 
    name: 'Blacksmith', 
    desc: 'Tempat pandai besi legendaris untuk menempa dan memperkuat peralatan.', 
    type: 'safezone',
    lore: 'Pandai besi ini mampu menempa senjata dengan api abadi. Membutuhkan biaya emas untuk setiap proses enchant.',
    atmosphere: 'Panas, suara dentuman palu godam, dan percikan api yang indah.'
  }
];

export default function Game({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('story'); // 'story', 'map', 'players', 'character', 'guilds', 'pets', 'dev'
  const [storyTab, setStoryTab] = useState<'personal' | 'world'>('personal');
  const [activeCombat, setActiveCombat] = useState<any>(null); // { enemyName: string, enemyHp: number, enemyMaxHp: number, statusEffects: string[] }
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [stories, setStories] = useState<any[]>([]);
  const [worldState, setWorldState] = useState<any>({ quests: [], merchantStock: [] });
  const [players, setPlayers] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [character, setCharacter] = useState(user.character);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [parties, setParties] = useState<any[]>([]);
  const [myParty, setMyParty] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingRequests.length > 0) {
      const timer = setTimeout(() => {
        setPendingRequests(prev => prev.slice(1));
        setAlertMessage('Interaction request timed out.');
        setIsAlertOpen(true);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [pendingRequests]);

  useEffect(() => {
    // Listen to World Story
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setStories(newStories);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    // Listen to Character Updates
    const charUnsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let char = data.character;
        
        if (char && char.exp >= char.level * 100) {
          let currentExp = char.exp;
          let currentLevel = char.level;
          let currentStatPoints = char.statPoints || 0;
          let maxHp = char.max_hp;
          let maxMp = char.max_mp;

          while (currentExp >= (currentLevel * 100)) {
            currentExp -= (currentLevel * 100);
            currentLevel++;
            currentStatPoints += 2;
            maxHp += 50;
            maxMp += 20;
          }

          const updatedChar = {
            ...char,
            exp: currentExp,
            level: currentLevel,
            statPoints: currentStatPoints,
            max_hp: maxHp,
            max_mp: maxMp,
            hp: char.hp > maxHp ? maxHp : char.hp,
            mp: char.mp > maxMp ? maxMp : char.mp
          };

          updateDoc(doc(db, 'users', user.uid), { character: updatedChar }).catch(console.error);
          setCharacter(updatedChar);
        } else {
          setCharacter(char);
        }
      }
    });

    // Listen to Players List
    const pQuery = query(collection(db, 'users'), limit(100));
    const pUnsub = onSnapshot(pQuery, (snapshot) => {
      const newPlayers = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let char = data.character;
        
        // Auto-migrate other players locally for display if needed
        if (char && char.exp >= char.level * 100) {
          let currentExp = char.exp;
          let currentLevel = char.level;
          let currentStatPoints = char.statPoints || 0;
          let maxHp = char.max_hp;
          let maxMp = char.max_mp;

          while (currentExp >= (currentLevel * 100)) {
            currentExp -= (currentLevel * 100);
            currentLevel++;
            currentStatPoints += 2;
            maxHp += 50;
            maxMp += 20;
          }

          const updatedChar = {
            ...char,
            exp: currentExp,
            level: currentLevel,
            statPoints: currentStatPoints,
            max_hp: maxHp,
            max_mp: maxMp,
            hp: char.hp > maxHp ? maxHp : char.hp,
            mp: char.mp > maxMp ? maxMp : char.mp
          };

          // Only update the database if it's the current user's document
          if (docSnap.id === user.uid) {
            updateDoc(doc(db, 'users', docSnap.id), { character: updatedChar }).catch(console.error);
          }
          
          return { id: docSnap.id, ...data, character: updatedChar };
        }
        
        return { id: docSnap.id, ...data };
      });
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
  const [newDisplayName, setNewDisplayName] = useState(user.display_name);

  const handleResetWorld = async () => {
    if (!window.confirm("Are you sure you want to delete ALL stories? This cannot be undone.")) return;
    try {
      const storiesSnapshot = await getDocs(collection(db, 'stories'));
      const batch = writeBatch(db);
      storiesSnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      setAlertMessage('World reset successfully!'); setIsAlertOpen(true);
    } catch (err) {
      console.error("Reset World Error:", err);
      setAlertMessage(`Failed to reset world: ${err instanceof Error ? err.message : String(err)}`); setIsAlertOpen(true);
    }
  };

  const handleUpdateDisplayName = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        display_name: newDisplayName
      });
      alert('Display name updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to update display name.');
    }
  };

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

  const handleAllocateStat = async (stat: string) => {
    if (!character || !character.statPoints || character.statPoints <= 0) return;

    const updatedCharacter = {
      ...character,
      statPoints: character.statPoints - 1,
      stats: {
        ...character.stats,
        [stat]: character.stats[stat] + 1
      }
    };

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        character: updatedCharacter
      });
    } catch (error) {
      console.error("Failed to allocate stat", error);
    }
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

      // Update Combat UI
      if (gmResponse.mekanik.combat_data) {
        setActiveCombat(gmResponse.mekanik.combat_data);
      } else {
        setActiveCombat(null);
      }

      // Update Interaction Request
      if (gmResponse.mekanik.interaction_request) {
        if (gmResponse.mekanik.interaction_request.to_player_id === user.uid) {
          setPendingRequests(prev => [...prev, gmResponse.mekanik.interaction_request]);
        }
      }

      // Update Equipment/Enchantment
      if (gmResponse.mekanik.equipment_updated || gmResponse.mekanik.enchantment_executed) {
        setAlertMessage(gmResponse.mekanik.equipment_updated ? `Equipped: ${gmResponse.mekanik.equipment_updated.item_equipped}` : `Enchanted: ${gmResponse.mekanik.enchantment_executed.item_enchanted} to level ${gmResponse.mekanik.enchantment_executed.new_enchant_level}`);
        setIsAlertOpen(true);
      }

      // 2. Update Character Stats
      let currentExp = character.exp + (gmResponse.mekanik.exp_gained || 0);
      let currentLevel = character.level;
      let currentStatPoints = character.statPoints || 0;

      while (currentExp >= (currentLevel * 100)) {
        currentExp -= (currentLevel * 100);
        currentLevel++;
        currentStatPoints += 2;
      }

      const newRank = gmResponse.mekanik.new_rank || character.rank;
      
      let maxHp = character.max_hp;
      let maxMp = character.max_mp;
      if (currentLevel > character.level) {
        const levelDiff = currentLevel - character.level;
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
        level: currentLevel,
        exp: currentExp,
        statPoints: currentStatPoints,
        gold: newGold,
        location: newLocation,
        rank: newRank,
        title: newTitle,
        titles: newTitlesList,
        guild: gmResponse.mekanik.guild_joined || character.guild || null,
        inventory: finalInventory,
        status: gmResponse.mekanik.new_status || character.status || 'Commoner',
        profession: gmResponse.mekanik.new_profession || character.profession || 'None'
      };

      await updateDoc(doc(db, 'users', user.uid), {
        character: updatedCharacter
      });

      // 3. Save Story Entry
      await addDoc(collection(db, 'stories'), {
        type: 'personal',
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

      // 3.5 Save Arc Summary to World Story if location changed
      if (gmResponse.arc_summary) {
        await addDoc(collection(db, 'stories'), {
          type: 'world',
          entry_id: `arc_${Date.now()}`,
          tanggal_in_game: `Hari ke-${Math.floor(Date.now() / 86400000) % 365}`,
          author_uid: user.uid,
          author_username: user.username,
          display_name: user.display_name,
          lokasi: character.location, // The previous location
          judul: `Rangkuman Arc: ${user.display_name} di ${character.location}`,
          isi_asli_player: "Perjalanan di lokasi ini telah berakhir.",
          isi_diperkaya_gm: gmResponse.arc_summary,
          dampak_dunia: "Kisah ini menjadi legenda baru di dunia.",
          tag: ["Arc Summary", character.location],
          pilihan_selanjutnya: [],
          createdAt: serverTimestamp()
        });
      }

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

  const getStatusEffectStyle = (effect: string) => {
    const lowerEffect = effect.toLowerCase();
    if (lowerEffect.includes('burn') || lowerEffect.includes('fire')) {
      return { icon: <Flame size={12} />, color: 'text-orange-400', bg: 'bg-orange-950/50', border: 'border-orange-900/50' };
    }
    if (lowerEffect.includes('poison') || lowerEffect.includes('toxic') || lowerEffect.includes('venom')) {
      return { icon: <Skull size={12} />, color: 'text-green-400', bg: 'bg-green-950/50', border: 'border-green-900/50' };
    }
    if (lowerEffect.includes('stun') || lowerEffect.includes('paralyze') || lowerEffect.includes('shock')) {
      return { icon: <Zap size={12} />, color: 'text-yellow-400', bg: 'bg-yellow-950/50', border: 'border-yellow-900/50' };
    }
    if (lowerEffect.includes('bleed')) {
      return { icon: <Droplet size={12} />, color: 'text-red-400', bg: 'bg-red-950/50', border: 'border-red-900/50' };
    }
    if (lowerEffect.includes('freeze') || lowerEffect.includes('chill') || lowerEffect.includes('ice')) {
      return { icon: <Snowflake size={12} />, color: 'text-cyan-400', bg: 'bg-cyan-950/50', border: 'border-cyan-900/50' };
    }
    return { icon: <Info size={12} />, color: 'text-zinc-400', bg: 'bg-zinc-900/50', border: 'border-zinc-800' };
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
          <button onClick={() => setIsPartyModalOpen(true)} className="text-zinc-500 hover:text-emerald-400 p-1">
            <Users size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* Combat UI Overlay */}
        {activeCombat && (
          <div className="absolute top-0 left-0 w-full bg-zinc-950/90 border-b border-red-900/50 p-4 z-30 animate-in slide-in-from-top">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-red-400 text-lg">{activeCombat.enemyName} <span className="text-xs bg-red-900/50 px-2 py-0.5 rounded">Rank {activeCombat.enemyRank}</span></h3>
              <span className="text-xs text-zinc-500 uppercase font-bold">Combat Active</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-700">
                <div className="h-full bg-red-600 transition-all" style={{ width: `${(activeCombat.enemyHp / activeCombat.enemyMaxHp) * 100}%` }}></div>
              </div>
              <span className="text-sm font-mono text-zinc-300">{activeCombat.enemyHp} / {activeCombat.enemyMaxHp}</span>
            </div>
            {activeCombat.statusEffects && activeCombat.statusEffects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeCombat.statusEffects.map((effect: string, i: number) => {
                  const style = getStatusEffectStyle(effect);
                  return (
                    <span key={i} className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border ${style.bg} ${style.border} ${style.color}`}>
                      {style.icon}
                      {effect}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STORY TAB */}
        <div className={`absolute inset-0 flex flex-col ${activeTab === 'story' ? 'z-10 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          <div className="flex justify-center gap-4 p-4 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-900 z-20">
            <button 
              onClick={() => setStoryTab('personal')} 
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${storyTab === 'personal' ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'}`}
            >
              Cerita Karakter
            </button>
            <button 
              onClick={() => setStoryTab('world')} 
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${storyTab === 'world' ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'}`}
            >
              Cerita Dunia
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-6 scroll-smooth">
            {stories.filter(story => storyTab === 'personal' ? (story.type !== 'world' && story.author_uid === user.uid) : story.type === 'world').length === 0 ? (
              <div className="text-center text-zinc-500 italic mt-20">The chronicles are empty. Begin your journey...</div>
            ) : (
              stories.filter(story => storyTab === 'personal' ? (story.type !== 'world' && story.author_uid === user.uid) : story.type === 'world').map((story) => (
                <div key={story.id} className={`flex flex-col max-w-3xl ${story.author_uid === user.uid ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-amber-500 text-sm">{story.display_name || story.author_username || 'Unknown'}</span>
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
          {storyTab === 'personal' && (
            <div className="w-full bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pt-10 pb-4 px-4">
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
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 text-base focus:outline-none focus:border-amber-500 text-zinc-100 placeholder-zinc-500"
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading || !input.trim()} className="bg-amber-600 hover:bg-amber-500 text-white px-6 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 min-h-[56px] min-w-[56px]">
                    {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={24} />}
                  </button>
                </form>
              </div>
            </div>
          )}
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
                    <button onClick={() => handleAction(`I travel to ${loc.name}`)} className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-6 py-4 rounded-xl flex-1 min-h-[56px] font-bold">Travel Here</button>
                  ) : (
                    <button onClick={() => handleAction(`I explore around ${loc.name} looking for events.`)} className="text-sm bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-600/30 px-6 py-4 rounded-xl flex-1 min-h-[56px] font-bold">Explore Area</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PLAYERS TAB */}
        <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 ${activeTab === 'players' ? 'z-10 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          <h2 className="text-xl font-serif font-bold text-amber-500 mb-4 flex items-center gap-2"><Users2 size={24}/> Realm Inhabitants</h2>
          <div className="grid gap-4">
            {players.filter(p => p.role !== 'dev').map((p) => (
              <div key={p.id} className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-amber-500 font-serif font-bold text-xl">
                        {p.character?.rank || 'F'}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${p.online ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100 flex items-center gap-2 text-base">
                        {p.display_name || p.username || 'Unknown'} 
                        {p.id === user.uid && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">You</span>}
                      </h3>
                      <p className="text-sm text-zinc-400">Lvl {p.character?.level || 1} • {p.character?.title || 'Novice'}</p>
                    </div>
                  </div>
                </div>
                {p.id !== user.uid && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-800">
                    <button onClick={() => handlePlayerInteraction(p, 'trade')} className="flex-1 flex items-center justify-center gap-2 text-sm bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400 py-4 rounded-xl min-h-[56px] font-bold">
                      <ArrowLeftRight size={18}/> Trade
                    </button>
                    <button onClick={() => handlePlayerInteraction(p, 'duel')} className="flex-1 flex items-center justify-center gap-2 text-sm bg-red-900/20 hover:bg-red-900/40 text-red-400 py-4 rounded-xl min-h-[56px] font-bold">
                      <Swords size={18}/> Duel
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
              <div className="flex justify-center gap-2 text-xs text-zinc-400 mt-2">
                <span className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800">Status: {character.status || 'Commoner'}</span>
                <span className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800">Profesi: {character.profession || 'None'}</span>
              </div>
              <p className="text-xs text-zinc-400 mt-2">Lvl {character.level} {character.ras} {character.class}</p>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Vitals */}
              <div className="space-y-3">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-4">
                  <h3 className="font-bold text-zinc-100 mb-3 text-xs uppercase">Edit Display Name</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newDisplayName} 
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100"
                      placeholder="New Display Name"
                    />
                    <button onClick={handleUpdateDisplayName} className="bg-amber-600 hover:bg-amber-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold">
                      Save
                    </button>
                  </div>
                </div>

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
                  <div className="flex justify-between text-xs mb-1"><span className="text-amber-400 flex items-center gap-1"><Star size={12}/> EXP</span><span>{character.exp} / {character.level * 100}</span></div>
                  <div className="h-1 bg-zinc-950 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.min(100, (character.exp / (character.level * 100)) * 100)}%` }}></div></div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Attributes</h3>
                  {character.statPoints > 0 && (
                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
                      {character.statPoints} Points Available
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {['str', 'agi', 'int', 'def', 'luck'].map(stat => (
                    <div key={stat} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
                      <span className="text-zinc-500 uppercase text-xs font-bold">{stat}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-200">{character.stats[stat]}</span>
                        {character.statPoints > 0 && (
                          <button 
                            onClick={() => handleAllocateStat(stat)}
                            className="w-5 h-5 bg-amber-600 hover:bg-amber-500 text-white rounded flex items-center justify-center font-bold leading-none"
                          >
                            +
                          </button>
                        )}
                      </div>
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

              {/* Equipment */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Equipment</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['weapon', 'armor', 'accessory'].map((slot) => (
                    <div key={slot} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-500 uppercase mb-1">{slot}</div>
                      <div className="text-xs font-bold text-zinc-300">
                        {character.equipment?.[slot as keyof Equipment]?.name || '-'}
                      </div>
                      {character.equipment?.[slot as keyof Equipment] && (
                        <div className="flex justify-center gap-1 mt-1">
                          <div className="text-[10px] text-zinc-500">
                            [{character.equipment[slot as keyof Equipment]?.rank || 'F'}]
                          </div>
                          <div className="text-[10px] text-amber-500">
                            +{character.equipment[slot as keyof Equipment]?.enchantLevel || 0}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Inventory */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Inventory</h3>
                  <div className="flex gap-2">
                    <select className="bg-zinc-950 text-zinc-300 text-[10px] px-2 py-1 rounded border border-zinc-800" onChange={(e) => { /* Add filter logic */ }}>
                      <option value="all">All</option>
                      <option value="weapon">Weapon</option>
                      <option value="armor">Armor</option>
                      <option value="accessory">Accessory</option>
                    </select>
                    <select className="bg-zinc-950 text-zinc-300 text-[10px] px-2 py-1 rounded border border-zinc-800" onChange={(e) => { /* Add sort logic */ }}>
                      <option value="name">Name</option>
                      <option value="rank">Rank</option>
                    </select>
                  </div>
                </div>
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
        {/* PETS TAB */}
        <div className={`absolute inset-0 overflow-y-auto p-4 pb-24 ${activeTab === 'pets' ? 'z-10 opacity-100' : '-z-10 opacity-0 pointer-events-none'}`}>
          <h2 className="text-xl font-serif font-bold text-amber-500 mb-4 flex items-center gap-2"><PawPrint size={20}/> My Pets</h2>
          {character.pets && character.pets.length > 0 ? (
            <div className="grid gap-3">
              {character.pets.map((pet: any, i: number) => (
                <div key={i} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-zinc-100">{pet.name} <span className="text-xs text-zinc-500 font-normal">({pet.type})</span></h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${pet.status === 'active' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-700 text-zinc-300'}`}>{pet.status}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mb-2">Level {pet.level} | HP: {pet.hp}/{pet.max_hp}</div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(`Send ${pet.name} on a mission.`)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg flex-1">Mission</button>
                    <button onClick={() => handleAction(`Have ${pet.name} assist in combat.`)} className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border border-amber-600/30 px-4 py-2 rounded-lg flex-1">Assist</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-zinc-500 italic mt-20">No pets tamed yet. Explore the world to find companions!</div>
          )}
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
                {!character.guild || !character.guild.toLowerCase().includes('adventurer') ? (
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
              {/* World Controls */}
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-zinc-100 mb-3">World Controls</h3>
                <button onClick={handleResetWorld} className="w-full bg-red-900/30 text-red-400 border border-red-800 py-2 rounded-lg text-xs font-bold">
                  Reset World (Delete All Stories)
                </button>
              </div>

              {/* User Controls */}
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-zinc-100 mb-3">User Controls</h3>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    value={newDisplayName} 
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100"
                    placeholder="New Display Name"
                  />
                  <button onClick={handleUpdateDisplayName} className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 py-2 rounded-lg text-sm font-bold">
                    Update Display Name
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
      <div className="h-20 border-t border-zinc-900 flex items-center justify-around bg-zinc-950/95 backdrop-blur-sm z-20 shrink-0 pb-2">
        <button onClick={() => setActiveTab('story')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'story' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <MessageSquare size={24} />
          <span className="text-[10px] font-medium">Story</span>
        </button>
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'map' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <MapIcon size={24} />
          <span className="text-[10px] font-medium">Map</span>
        </button>
        <button onClick={() => setActiveTab('guilds')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'guilds' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Shield size={24} />
          <span className="text-[10px] font-medium">Guilds</span>
        </button>
        <button onClick={() => setActiveTab('players')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'players' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Users2 size={24} />
          <span className="text-[10px] font-medium">Players</span>
        </button>
        <button onClick={() => setActiveTab('character')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'character' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <User size={24} />
          <span className="text-[10px] font-medium">Character</span>
        </button>
        <button onClick={() => setActiveTab('pets')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'pets' ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <PawPrint size={24} />
          <span className="text-[10px] font-medium">Pets</span>
        </button>
        {isDev && (
          <button onClick={() => setActiveTab('dev')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'dev' ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Wrench size={24} />
            <span className="text-[10px] font-medium">Dev</span>
          </button>
        )}
      </div>
      <GameAlert isOpen={isAlertOpen} message={alertMessage} onClose={() => setIsAlertOpen(false)} />
      
      {/* Interaction Requests Modal */}
      {pendingRequests.length > 0 && (
        <div className="fixed inset-0 bg-zinc-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Interaction Request</h3>
            <p className="text-zinc-400 text-sm mb-6">{pendingRequests[0].from_player_name} wants to {pendingRequests[0].type}: {pendingRequests[0].message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  handleAction(`I accept the ${pendingRequests[0].type} request from ${pendingRequests[0].from_player_name}`);
                  setPendingRequests(prev => prev.slice(1));
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-bold"
              >
                Accept
              </button>
              <button 
                onClick={() => {
                  handleAction(`I decline the ${pendingRequests[0].type} request from ${pendingRequests[0].from_player_name}`);
                  setPendingRequests(prev => prev.slice(1));
                }}
                className="flex-1 bg-red-900/50 hover:bg-red-900/70 text-red-200 py-2 rounded-lg font-bold"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      <PartyModal 
        isOpen={isPartyModalOpen} 
        onClose={() => setIsPartyModalOpen(false)} 
        user={user}
        parties={parties}
        myParty={myParty}
        onCreateParty={async (name: string, desc: string, approvalType: string) => {
          await addDoc(collection(db, 'parties'), {
            name,
            description: desc,
            approvalType,
            leaderId: user.uid,
            members: [{ id: user.uid, name: user.display_name }],
            joinRequests: []
          });
          setIsPartyModalOpen(false);
          setAlertMessage('Party created!'); setIsAlertOpen(true);
        }}
        onJoinParty={async (partyId: string) => {
          const partyRef = doc(db, 'parties', partyId);
          await updateDoc(partyRef, {
            joinRequests: [...(myParty?.joinRequests || []), { playerId: user.uid, playerName: user.display_name }]
          });
          setAlertMessage('Join request sent!'); setIsAlertOpen(true);
        }}
        onApproveJoinRequest={async (playerId: string) => {
          const partyRef = doc(db, 'parties', myParty.id);
          const player = players.find(p => p.id === playerId);
          await updateDoc(partyRef, {
            members: [...myParty.members, { id: playerId, name: player?.display_name }],
            joinRequests: myParty.joinRequests.filter((req: any) => req.playerId !== playerId)
          });
        }}
        onAcceptInvitation={(partyId: string) => {
          // Implement logic
        }}
        onDeclineInvitation={(partyId: string) => {
          // Implement logic
        }}
        players={[]}
      />
    </div>
  );
}
