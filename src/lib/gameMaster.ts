import { GoogleGenAI, Type } from '@google/genai';

export async function processPlayerAction(
  playerAction: string,
  playerData: any,
  recentStories: any[],
  configs: any,
  worldState: any = {}
) {
  // Use GEMINI_API_KEY as primary, fallback to VITE_GEMINI_API_KEY, import.meta.env.GEMINI_API_KEY, or API_KEY
  const apiKey = 
    process.env.GEMINI_API_KEY || 
    process.env.VITE_GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.length < 10) {
    console.error("Gemini API Key is missing, invalid, or too short.");
    throw new Error("API Key tidak valid atau belum diset di Settings. Pastikan Anda telah memasukkan API Key Gemini yang benar.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Truncate context to prevent token limit errors
  const truncatedRecentStories = JSON.stringify(recentStories, null, 2).slice(0, 5000);
  const truncatedWorldState = JSON.stringify(worldState, null, 2).slice(0, 2000);

  const systemInstruction = `You are the AI Game Master for "World Chronicle", a text-based multiplayer RPG.
Your job is to validate the player's action, enrich the narrative, determine mechanical outcomes, and describe the world's reaction.

**CRITICAL LANGUAGE RULE**: You MUST write the \`narasi\` (narrative), \`dunia_bereaksi\` (world reaction), and \`pilihan_selanjutnya\` (next options) entirely in Indonesian (Bahasa Indonesia). However, you MUST keep all RPG and fantasy terminology in English (e.g., Guild, Quest, Rank, HP, MP, Skill, Cooldown, Element, Warrior, Mage, Slime, Demon, etc.).

### Taming System:
1. Players can tame monsters (e.g., Slime Hijau, Naga Kecil Hijau).
2. Taming requires a successful action (e.g., feeding, showing strength, using special items).
3. If successful, add the monster to the player's 'pets' array in their data.
4. Pets have stats (HP, STR, AGI, INT) and can be sent on missions or assist in combat.
5. If a pet assists in combat, calculate its contribution based on its stats.

### Combat System:
1. Players can use skills with cooldowns and mana costs.
2. Status effects include stun, poison, burn, buffs, and debuffs.
3. Enemies have complex AI:
   - They can heal themselves if HP is low.
   - They target weak players first.
   - They use skills based on their type (e.g., Fire monsters use burn, Ice monsters use stun).
4. When a player uses a skill, check if it's on cooldown. If not, apply the effect and set the cooldown.
5. Status effects persist over turns. Track their remaining duration.

### Equipment & Enchantment System:
1. Players can equip weapons, armor, and accessories.
2. Equipped items provide stat bonuses and special effects.
3. Players can visit a Blacksmith to enchant items, increasing their stats or adding special effects.
4. There are 7 legendary weapons representing the 7 Deadly Sins (Pride, Envy, Wrath, Sloth, Greed, Gluttony, Lust), each with unique powerful effects.
5. If an item is equipped or enchanted, use 'equipment_updated' or 'enchantment_executed' in the response.

### Interaction System (Duel, Trade, Party):
1. Players can initiate interactions (duel, trade, party) with other players.
2. **CRITICAL**: Before initiating, check if the target player is online (status: 'active'). If offline, inform the player and do not initiate.
3. To initiate, the player states their intent (e.g., "I want to duel [Player Name]").
4. The Game Master validates if both players are in the same location and if the target is online.
5. If valid, the Game Master MUST ONLY return an interaction_request object. DO NOT perform the action (e.g., do not start the duel, do not transfer items) until the request is accepted.
6. When the player accepts, the Game Master will receive a new action "I accept the [type] request from [Player Name]". Only then should the Game Master perform the action and update the state.
7. If a request is accepted, use the corresponding signal (e.g., 'trade_executed', 'duel_started') in the response.

Respond ONLY with a JSON object matching the provided schema. Do not include markdown formatting like \`\`\`json.`;

  const prompt = `
### Player Data:
${JSON.stringify(playerData, null, 2)}

### World State (Quests & Merchant Stock):
${truncatedWorldState}

### Recent World Events/Stories (Context):
${truncatedRecentStories}

### Player Action:
"${playerAction}"

### Instructions:
1. Validate the action based on the player's stats (str, agi, int, def, luck), level, element, rank, and title. **CRITICAL: Attributes (stats) heavily influence the outcome of actions, combat, and interactions. A player with high STR can lift heavy objects or deal massive physical damage, high AGI allows dodging and fast attacks, high INT improves magic and puzzle-solving, high DEF reduces damage taken, and high LUCK increases critical hits and rare item finds.**
2. **CRITICAL COMBAT LOGIC**: If the player is fighting or dueling, you MUST explicitly calculate and mention Class and Elemental advantages/disadvantages. 
   - Element Counters: Fire beats Wind/Nature. Water beats Fire/Earth. Wind beats Earth/Lightning. Earth beats Lightning/Fire. Lightning beats Water/Ice. Nature beats Water/Lightning. Ice beats Wind/Nature. Light and Dark counter each other.
   - Class Counters: Warriors beat Assassins/Archers. Mages beat Warriors/Paladins. Assassins beat Mages/Clerics. Paladins beat Assassins/Necromancers. Archers beat Mages/Necromancers. Necromancers beat Warriors/Archers. Clerics beat Necromancers/Mages.
   - If the player has an advantage, they deal more damage and take less. If they have a disadvantage, they struggle unless they use a clever strategy.
3. Enrich the narrative with sensory details and lore. Use the \`current_location_lore\` and \`current_location_atmosphere\` from the World State to describe the environment vividly. Incorporate how the player's specific attributes helped or hindered them.
4. Determine mechanical consequences (HP/MP changes, EXP gained, items found, stat checks).
5. **Guilds & Economy**:
   - If the player interacts with the Adventurer's Guild (e.g., taking a quest), provide appropriate EXP and Gold rewards upon completion. You may also update the quest board by providing \`updated_quests\`.
   - If the player interacts with the Merchant's Guild (buying/selling), deduct/add gold and items accordingly. Use \`items_lost\` to remove sold items from their inventory.
   - **IMPORTANT**: Merchant stock is dynamic. If a player buys an item, reduce its stock. If stock is low, increase its price and rank (difficulty to obtain). If stock is high, decrease price and rank. You can update the stock by providing \`updated_merchant_stock\`.
   - Item ranks are F, E, D, C, B, A, S.
6. **The 7 Deadly Sins Demons**:
   - There is a 1-15% chance (use RNG) for a player to encounter a Demon of the 7 Deadly Sins while exploring random places.
   - Requirement: Player MUST be at least Rank C to encounter them.
   - Demon Ranks: 70% chance to be Rank A, 30% chance to be Rank S.
   - The 7 Demons and their Weapons:
     1. Pride: Sceptre (Kesombongan) - Effect: Pukulan Cahaya (Single Target, reduces enemy defense)
     2. Envy: Knife (Irek) - Effect: Racun (Single Target, reduces enemy HP slowly)
     3. Wrath: Axe (Amarah) - Effect: Api-Api (Area, massive damage to surrounding enemies)
     4. Sloth: Sleep Gun (Kemalasan) - Effect: Tidur (Single Target, enemy cannot move)
     5. Greed: Throwing Coin (Ketamakan) - Effect: Hipnotis Uang (Single Target, enemy attacks themselves)
     6. Gluttony: Giant Fork (Rakus) - Effect: Makan (Area, drains HP from surrounding enemies)
     7. Lust: Whip (Nafsu) - Effect: Pusing (Single Target, reduces enemy accuracy)
   - If encountered, the player has 3 options:
     - Option 1: Defeat (Mengalahkan) - Requires power equal to or greater than the demon. Reward: The weapon WITHOUT side effects.
     - Option 2: Contract (Kontrak) - Reward: The weapon WITH side effects (player doesn't have full rights to it). Side effects vary per weapon.
     - Option 3: Run (Kabur) - Reward: Nothing. 50% chance to lose HP. The demon disappears from that location and moves elsewhere.
   - If fought in a party: The loot is only Tier B, the weapon can still be found later, and the demon remains alive.
7. Describe how the world or other players might react.
8. Provide 3-4 options for the player's next move.
9. If the player achieves something great, you can award a new Title or upgrade their Rank (F, E, D, C, B, A, S).
10. **ARC SUMMARY**: If the player changes location (i.e., they leave their current location and go to a new one), you MUST provide an \`arc_summary\` summarizing their entire adventure in the previous location. This will be published to the World Story. If they do not change location, leave \`arc_summary\` empty.
11. **LANGUAGE**: Remember to write narrative, world reaction, next options, and arc summary in Bahasa Indonesia, but keep RPG terms in English.
`;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  let retries = 3;
  let backoff = 1000;

  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview', // Most cost-effective model for high-frequency RPG actions
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              narasi: { type: Type.STRING, description: "The enriched narrative of what happens." },
              mekanik: {
                type: Type.OBJECT,
                properties: {
                  hp_change: { type: Type.NUMBER, description: "Change in HP (negative for damage, positive for heal, 0 for none)" },
                  mp_change: { type: Type.NUMBER, description: "Change in MP" },
                  exp_gained: { type: Type.NUMBER, description: "EXP gained from the action" },
                  gold_change: { type: Type.NUMBER, description: "Change in Gold (money). Positive for gain, negative for loss." },
                  items_gained: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        rank: { type: Type.STRING, description: "Item rank: F, E, D, C, B, A, S" },
                        buyPrice: { type: Type.NUMBER, description: "Price to buy this item in shops" },
                        sellPrice: { type: Type.NUMBER, description: "Price to sell this item to shops" }
                      },
                      required: ["name", "rank", "buyPrice", "sellPrice"]
                    }, 
                    description: "Items acquired" 
                  },
                  items_lost: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Names of items lost or sold."
                  },
                  status_effects: { type: Type.ARRAY, items: { type: Type.STRING }, description: "New status effects" },
                  new_status: { type: Type.STRING, description: "New status (e.g., 'Bangsawan'). Empty string if no change." },
                  new_profession: { type: Type.STRING, description: "New profession (e.g., 'Ksatria'). Empty string if no change." },
                  location_change: { type: Type.STRING, description: "New location name, if the player moved. Otherwise empty string." },
                  guild_joined: { type: Type.STRING, description: "Name of the guild joined (e.g., 'Adventurer'), if any. Otherwise empty string." },
                  updated_quests: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        rank: { type: Type.STRING },
                        description: { type: Type.STRING }
                      },
                      required: ["name", "rank", "description"]
                    },
                    description: "If the quest board should be updated, provide the new list of available quests."
                  },
                  updated_merchant_stock: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        rank: { type: Type.STRING },
                        buyPrice: { type: Type.NUMBER },
                        sellPrice: { type: Type.NUMBER },
                        stock: { type: Type.NUMBER }
                      },
                      required: ["name", "rank", "buyPrice", "sellPrice", "stock"]
                    },
                    description: "If the merchant stock should be updated (due to RNG or story), provide the new list of items."
                  },
                  new_title: { 
                    type: Type.OBJECT, 
                    description: "Award a new title if deserved. Null if none.",
                    properties: {
                      name: { type: Type.STRING },
                      effect: { type: Type.STRING }
                    },
                    required: ["name", "effect"]
                  },
                  new_rank: { type: Type.STRING, description: "New rank (F, E, D, C, B, A, S) if upgraded. Empty string if no change." },
                  pets: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        level: { type: Type.NUMBER },
                        hp: { type: Type.NUMBER },
                        max_hp: { type: Type.NUMBER },
                        str: { type: Type.NUMBER },
                        agi: { type: Type.NUMBER },
                        int: { type: Type.NUMBER },
                        status: { type: Type.STRING, description: "active or mission" }
                      },
                      required: ["id", "name", "type", "level", "hp", "max_hp", "str", "agi", "int", "status"]
                    },
                    description: "Updated list of pets."
                  },
                  skills: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        cooldown: { type: Type.NUMBER },
                        remainingCooldown: { type: Type.NUMBER },
                        manaCost: { type: Type.NUMBER }
                      },
                      required: ["id", "name", "description", "cooldown", "remainingCooldown", "manaCost"]
                    },
                    description: "Updated list of skills with cooldowns."
                  },
                  active_status_effects: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        type: { type: Type.STRING, description: "stun, poison, burn, buff, debuff" },
                        duration: { type: Type.NUMBER },
                        description: { type: Type.STRING }
                      },
                      required: ["id", "name", "type", "duration", "description"]
                    },
                    description: "Updated list of active status effects."
                  },
                  trade_executed: {
                    type: Type.OBJECT,
                    description: "If a trade was executed, provide details.",
                    properties: {
                      item_traded: { type: Type.STRING },
                      pet_traded: { type: Type.STRING },
                      to_player: { type: Type.STRING }
                    }
                  },
                  equipment_updated: {
                    type: Type.OBJECT,
                    description: "If equipment was changed, provide details.",
                    properties: {
                      item_equipped: { type: Type.STRING },
                      slot: { type: Type.STRING, description: "weapon, armor, or accessory" }
                    }
                  },
                  enchantment_executed: {
                    type: Type.OBJECT,
                    description: "If an item was enchanted, provide details.",
                    properties: {
                      item_enchanted: { type: Type.STRING },
                      new_enchant_level: { type: Type.NUMBER }
                    }
                  },
                  combat_data: {
                    type: Type.OBJECT,
                    description: "If in combat, provide enemy status.",
                    properties: {
                      enemyName: { type: Type.STRING },
                      enemyRank: { type: Type.STRING, description: "Enemy rank: F, E, D, C, B, A, S" },
                      enemyHp: { type: Type.NUMBER },
                      enemyMaxHp: { type: Type.NUMBER },
                      statusEffects: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["enemyName", "enemyRank", "enemyHp", "enemyMaxHp"]
                  },
                  interaction_request: {
                    type: Type.OBJECT,
                    description: "If a player initiates an interaction (duel, trade, party), provide request details.",
                    properties: {
                      from_player_name: { type: Type.STRING },
                      from_player_id: { type: Type.STRING },
                      to_player_id: { type: Type.STRING },
                      type: { type: Type.STRING, description: "duel, trade, party" },
                      message: { type: Type.STRING }
                    },
                    required: ["from_player_name", "from_player_id", "to_player_id", "type", "message"]
                  }
                },
                required: ["hp_change", "mp_change", "exp_gained", "gold_change", "items_gained", "items_lost", "status_effects", "location_change", "guild_joined", "new_rank"]
              },
              dunia_bereaksi: { type: Type.STRING, description: "How the world or nearby entities react to this action." },
              pilihan_selanjutnya: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 options for the player's next move." },
              tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant tags for this story entry (e.g., location, NPCs involved, event name)." },
              arc_summary: { type: Type.STRING, description: "If the player changes location (location_change is not empty), provide a summary of their entire adventure in the previous location to be published to the World Story. Otherwise, leave it empty." }
            },
            required: ["narasi", "mekanik", "dunia_bereaksi", "pilihan_selanjutnya", "tags"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response from AI Game Master.");
      }

      // Clean response text in case markdown blocks are returned despite instructions
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        return JSON.parse(cleanJson);
      } catch (parseError) {
        console.error("JSON Parse Error. Raw text:", text);
        throw new Error("Game Master returned an invalid response format.");
      }
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('Rate exceeded') || error.message?.includes('Quota exceeded')) {
        retries--;
        if (retries === 0) {
          console.error("Game Master Error (Rate Limit):", error);
          throw new Error("Batas kuota API Gemini telah tercapai. Silakan periksa penggunaan kuota dan detail penagihan Anda di https://aistudio.google.com/ atau tunggu beberapa saat hingga kuota direset.");
        }
        console.warn(`Rate limit tercapai. Mencoba lagi dalam ${backoff}ms...`);
        await delay(backoff);
        backoff *= 2;
      } else {
        console.error("Game Master Error:", error);
        throw error;
      }
    }
  }
}
