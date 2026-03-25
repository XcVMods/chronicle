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
