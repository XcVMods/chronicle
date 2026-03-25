export interface Pet {
  id: string;
  name: string;
  type: string;
  level: number;
  hp: number;
  max_hp: number;
  str: number;
  agi: number;
  int: number;
  status: 'active' | 'mission';
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'accessory';
  rank: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  stats: {
    str?: number;
    agi?: number;
    int?: number;
    def?: number;
    luck?: number;
  };
  effect?: string;
  enchantLevel?: number;
}

export interface Equipment {
  weapon?: Item;
  armor?: Item;
  accessory?: Item;
}

export interface Character {
  // ... existing fields
  equipment: Equipment;
  inventory: Item[];
  // ...
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  remainingCooldown: number;
  manaCost: number;
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'stun' | 'poison' | 'burn' | 'buff' | 'debuff';
  duration: number;
  description: string;
}
