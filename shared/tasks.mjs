// The bingo board. Edit here, not in the database: ticks are stored by task id.
// Points: standard 6, chungus 10, prestige 5 base + 3 prestige (prestige only counts once the base is ticked),
// incremental 1 per step, pvp 3/2/1 for 1st/2nd/3rd (awarded by the organiser).

export const POINTS = { standard: 6, chungus: 10, prestigeBase: 5, prestigeBonus: 3, step: 1, pvp: [3, 2, 1] };

export const TEAMS = [
  { id: "crystal", name: "Crystal Gimpling", players: ["Adam", "Spenny", "Ryan"], env: "PASS_CRYSTAL" },
  { id: "kizz", name: "Kizz on my face", players: ["Kier", "James", "Jordan"], env: "PASS_KIZZ" },
  { id: "poppers", name: "Port Sarim Poppers", players: ["Reece", "Brett", "Ed"], env: "PASS_POPPERS" },
  { id: "jobcentre", name: "Job Centre p++", players: ["Ben", "Batley", "Anky", "Pringle"], env: "PASS_JOBCENTRE" },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const std = (kind, list) => list.map(([name, condition]) => ({ id: `${kind}:${slug(name)}`, kind, name, condition }));

export const STANDARD = std("standard", [
  ["Masks", "Get a Mask of Ranuul and a Shaman Mask"],
  ["One Man One Jar", "Get any Jar"],
  ["Moon Chest", "Get both halves of the Lunar Key"],
  ["Back to Revs", "Get an Ancient Relic, Effigy or Medallion"],
  ["Return of the Champ Scroll", "Get any Champion scroll"],
  ["Spider Clogs", "Get 1 unique from each of Venenatis, Sarachnis, Araxxor"],
  ["Yamadabadoo", "Get 1 piece of Oathplate or Soulflame Horn"],
  ["Unsired", "Get 2 Bludgeon pieces"],
  ["Woodcutting", "1m Woodcutting xp"],
  ["Runecrafting", "1m Runecrafting xp"],
  ["Mining", "1m Mining xp"],
  ["Agility", "1m Agility xp"],
  ["Sailing!!!!", "2m Sailing xp"],
  ["Buttplug", "Get a Masterwand or Mage's Book"],
  ["Twinflame", "Get both Twinflame staff pieces"],
  ["What are those???", "Get a Medium Clue boots reward"],
  ["Ironman", "Get a Zombie Helmet, Axe, and Warped Sceptre"],
  ["Hawk Cluah", "Get a Dragon Mask from an Elite Clue or Demon Mask from a Master Clue"],
  ["EZ", "Get a Ham Joint or Flared Trousers from an Easy Clue"],
  ["GG", "Get a GGs Unique"],
  ["Yet another Forgotten 4", "Any piece of virtus"],
  ["Bookworm", "Get any Tome"],
  ["Boss Pet", "Get any Boss Pet"],
  ["Skilling Pet", "Get any Skilling Pet"],
  ["PMs", "Get one drop from each Moon"],
  ["ToB", "Get a ToB purple"],
  ["CoX", "Get a CoX purple"],
  ["ToA", "Get a ToA purple"],
  ["Mad Angel", "Get a Mad Angel unique"],
  ["Synapse", "Get a Synapse"],
  ["Maggot King", "Get a Maggot King Unique"],
  ["GotR", "Get two of: Dye, Lantern, Abyssal Needle, Pet"],
  ["We <3 Sailing!", "Get EITHER Drag Cannon or Salvaging Hook AND Bottled Storm"],
  ["We <3 Trawling!", "Get 1 of any Trawling Big Fish"],
  ["Giants", "Get Bryo Essence or Giants Club"],
  ["Capybara Gaming", "Get Fletching Knife, Jewellers Chisel, and Prescription Goggles/Storage"],
  ["Hydra", "Any Hydra unique"],
  ["Sailing PvM", "Get a Shellbane unique + Horn of Plenty OR Aquanite Tendon"],
  ["Elf Style", "Pickpocket an Enhanced Crystal Teleport Seed"],
  ["Zealot", "Get full Zealot Robes"],
  ["Sceptre", "Pharoah's Sceptre"],
]);

export const CHUNGUS = std("chungus", [
  ["Rare Clue", "Get a Rare Clue drop"],
  ["Back to GWD", "Get a unique (not Godsword Shard) from each GWD Boss excluding Nex"],
  ["Dragon Warrior", "Get a Dragon Full Helm, Dragon Metal Lump, or Dragon Metal Slice"],
  ["Capes", "Complete 1x Inferno or 2x Colo or 5x Fight Caves"],
  ["Nightmare", "Any Nightmare unique"],
  ["Money Maker", "Get an Amulet of Eternal Glory"],
  ["Superior Slayer", "Get an Imbued Heart or Eternal Slayer Gem"],
  ["Autism Complete", "Get a Soulreaper Axe"],
  ["Doom", "Get a glowie hole from Doom"],
  ["The Adam Task", "Get a Ring of Endurance"],
  ["Voidwaker", "Build a Voidwaker"],
  ["Paint", "Get Salvors, Anglers, Barracuda, or Inky Paint"],
]);

export const PRESTIGE = [
  ["Blood Torva", "Bandos Tassets or Chestplate", "Kill any Awakened Boss"],
  ["Ancient Ceremony", "Get 3 unique Ancient Ceremonial Robes", "Get a full set of Ancient Ceremonial"],
  ["Gauntleting", "Get 3 Armour and/or Weapon Seeds", "Get an Enhanced Seed"],
  ["Rev weapon", "Get a rev weapon upgrade", "Get the respective rev weapon"],
  ["Gone Fishing", "Golden Tench", "Any Fishing Utility drop from Tempoross"],
  ["Build-a-Godsword", "Get any God Hilt", "Get each Godsword piece"],
  ["Ed's Fave", "Get all DK rings", "Add a vestige to any of them"],
  ["Barrows Bukkake", "Get a Barrows drop for each slot", "All from the same bro"],
  ["Dragonslayer 3", "Get a unique from Huey and Zulrah", "Get a Draconic/Skeletal Visage"],
  ["Purples", "Get any Raid Purple", "One from two different raids"],
  ["Spider Monkeys", "Get 2 Zenytes", "Araxyte Fang or Elder Venator Fang"],
  ["Tools of the Trade", "Get a Dragon Harpoon, Axe, and Pickaxe", "Get a Smouldering Stone"],
  ["Reddit", "Get Mole Slippers", "Get Holy Sandals"],
  ["Venator Bow", "Get 2 Venator Shards", "Get 3 Shards"],
  ["Really scary", "Make an Odium or Malediction Ward", "Make the other one"],
].map(([name, condition, prestige]) => ({ id: `prestige:${slug(name)}`, kind: "prestige", name, condition, prestige }));

// `steps` is the number of ticks a task has (one point each). Ticks are stored per step.
export const INCREMENTAL = [
  ["Noob Weapons", "Leafbladed Weapon, Trident of Sea, Brine Sabre, G Maul, G Sword", 5],
  ["Demonslayer", "Abyssal Whip, Abyssal Dagger, Synapse, Burning Claw, Zalcano Shard", 5],
  ["Fury Warrior", "Sulphur Blades, Glacial Temotli, Dual Macuahuitl, Earthbound Tecpatl", 4],
  ["Autism in Progress", "Get each piece of the Soulreaper Axe", 4],
  ["Lord of the Rings pt 2", "Callisto, Vetion, Venenatis Ring", 3],
  ["Slops", "Any item that can be mounted on a Head display and Araxyte head", 7],
  ["Monkeys", "Each monkey backpack", 6],
].map(([name, condition, steps]) => ({ id: `inc:${slug(name)}`, kind: "incremental", name, condition, steps }));

export const PVP = [
  ["Duel Arena 1v1 Tourney", "Placement: 3 / 2 / 1 points"],
  ["LMS Tourney", "Placement: 3 / 2 / 1 points"],
  ["Clan Wars Tourney", "Placement: 3 / 2 / 1 points"],
  ["Biggest PK value (ge)", "Placement: 3 / 2 / 1 points"],
  ["Most Bones PK'd", "Placement: 3 / 2 / 1 points"],
].map(([name, condition]) => ({ id: `pvp:${slug(name)}`, kind: "pvp", name, condition }));

export const SECTIONS = [
  { id: "standard", title: "Standard tasks", blurb: "6 points each", tasks: STANDARD },
  { id: "chungus", title: "CHUNGUS MODE", blurb: "10 points each", tasks: CHUNGUS },
  { id: "prestige", title: "Prestige", blurb: "5 for the base, +3 for the prestige (only counts once the base is done)", tasks: PRESTIGE },
  { id: "incremental", title: "Incremental", blurb: "1 point per step", tasks: INCREMENTAL },
  { id: "pvp", title: "PvP", blurb: "3 / 2 / 1 points for 1st / 2nd / 3rd, awarded by the organiser", tasks: PVP },
];

/** Every tickable key a team may submit: `<task id>` for most tasks, `<id>#p` for the prestige part, `<id>#<n>` for steps. */
export function validKeys() {
  const keys = new Set();
  for (const t of [...STANDARD, ...CHUNGUS]) keys.add(t.id);
  for (const t of PRESTIGE) { keys.add(t.id); keys.add(`${t.id}#p`); }
  for (const t of INCREMENTAL) for (let i = 1; i <= t.steps; i++) keys.add(`${t.id}#${i}`);
  return keys;
}
