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
    (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || 
    (import.meta.env && import.meta.env.GEMINI_API_KEY) ||
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

### Taming System:
1. Players can tame monsters (e.g., Slime Hijau, Naga Kecil Hijau).
2. Taming requires a successful action (e.g., feeding, showing strength, using special items).
3. If successful, add the monster to the player's 'pets' array in their data.
4. Pets have stats (HP, STR, AGI, INT) and can be sent on missions or assist in combat.
5. If a pet assists in combat, calculate its contribution based on its stats.

### Trading System:
1. Players can trade items or pets with other players.
2. A player initiates a trade by stating "I want to trade [item/pet] with [Player Name]".
3. The Game Master validates if both players are in the same location.
4. If valid, the Game Master creates a trade proposal.
5. The other player must accept the trade.
6. Upon acceptance, the Game Master updates both players' inventories/pets.
7. If a trade is executed, use 'trade_executed' in the response to signal the inventory/pet update.

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
1. Validate the action based on the player's stats, level, element, rank, and title.
2. **CRITICAL COMBAT LOGIC**: If the player is fighting or dueling, you MUST explicitly calculate and mention Class and Elemental advantages/disadvantages. 
   - Element Counters: Fire beats Wind/Nature. Water beats Fire/Earth. Wind beats Earth/Lightning. Earth beats Lightning/Fire. Lightning beats Water/Ice. Nature beats Water/Lightning. Ice beats Wind/Nature. Light and Dark counter each other.
   - Class Counters: Warriors beat Assassins/Archers. Mages beat Warriors/Paladins. Assassins beat Mages/Clerics. Paladins beat Assassins/Necromancers. Archers beat Mages/Necromancers. Necromancers beat Warriors/Archers. Clerics beat Necromancers/Mages.
   - If the player has an advantage, they deal more damage and take less. If they have a disadvantage, they struggle unless they use a clever strategy.
3. Enrich the narrative with sensory details and lore. Use the \`current_location_lore\` and \`current_location_atmosphere\` from the World State to describe the environment vividly.
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
`;

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
                trade_executed: {
                  type: Type.OBJECT,
                  description: "If a trade was executed, provide details.",
                  properties: {
                    item_traded: { type: Type.STRING },
                    pet_traded: { type: Type.STRING },
                    to_player: { type: Type.STRING }
                  }
                }
              },
              required: ["hp_change", "mp_change", "exp_gained", "gold_change", "items_gained", "items_lost", "status_effects", "location_change", "guild_joined", "new_rank"]
            },
            dunia_bereaksi: { type: Type.STRING, description: "How the world or nearby entities react to this action." },
            pilihan_selanjutnya: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 options for the player's next move." },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant tags for this story entry (e.g., location, NPCs involved, event name)." }
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
  } catch (error) {
    console.error("Game Master Error:", error);
    throw error;
  }
}
