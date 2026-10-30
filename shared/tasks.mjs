// The bingo board. Edit here, not in the database: ticks are stored by task id.
// Points: standard 6, chungus 10, prestige 5 base + 3 prestige (prestige only counts once the base is ticked),
// incremental 1 per step, pvp 3/2/1 for 1st/2nd/3rd (awarded by the organiser).

export const POINTS = { standard: 6, chungus: 10, prestigeBase: 5, prestigeBonus: 3, step: 1, pvp: [3, 2, 1] };

/**
 * When the bingo runs, in UK time (GMT from 25 Oct 2026, so the same as UTC):
 * from the stroke of midnight going into Sunday 1 November to the end of Sunday 22 November 2026.
 * Set `start` to null to use the first tick anyone makes instead.
 */
export const BINGO = { start: Date.parse("2026-11-01T00:00:00Z"), end: Date.parse("2026-11-22T23:59:59Z") };

export const TEAMS = [
  { id: "crystal", name: "Crystal Gimpling", players: ["Adam", "Spenny", "Ryan"], env: "PASS_CRYSTAL" },
  { id: "kizz", name: "Kizz on my face", players: ["Kier", "James", "Jordan"], env: "PASS_KIZZ" },
  { id: "poppers", name: "Port Sarim Poppers", players: ["Reece", "Brett", "Ed"], env: "PASS_POPPERS" },
  { id: "jobcentre", name: "Job Centre p++", players: ["Ben", "Batley", "Anky", "Pringle"], env: "PASS_JOBCENTRE" },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** `rule`, when given, is the clarifying ruling from Sheet2 — shown as a hover note (ⓘ) on the task's tile and listed on the organiser page. */
const std = (kind, list) => list.map(([name, condition, rule]) => ({ id: `${kind}:${slug(name)}`, kind, name, condition, ...(rule ? { rule } : {}) }));

const CLUE_STACK = "No stacking clues or caskets: clues must be obtained and completed during the bingo.";

/** Rules that apply to the whole board. Shown on the organiser page and at the top of each team page. */
export const GENERAL_RULES = [
  "Everything is pooled across your team: drops can be split between teammates, and a tick belongs to the team.",
  "Drops must be obtained during the bingo. Nothing can be bought, and nothing can be preloaded (no saved-up chests, caskets, seeds or runs in progress).",
  "A task's own rule (the ⓘ next to its name) is extra to these and wins if they differ.",
  "Be reasonable. The organiser has the final say on any dispute.",
];

export const STANDARD = std("standard", [
  ["Masks", "Get a Mask of Ranuul and a Shaman Mask"],
  ["One Man One Jar", "Get any Jar"],
  ["Moon Chest", "Get both halves of the Lunar Key"],
  ["Back to Revs", "Get an Ancient Relic, Effigy or Medallion"],
  ["Return of the Champ Scroll", "Get any Champion scroll"],
  ["Spider Clogs", "Get 1 unique from each of Venenatis, Sarachnis, Araxxor", "Teleports and coagulated venom don't count."],
  ["Yamadabadoo", "Get 1 piece of Oathplate or Soulflame Horn"],
  ["Unsired", "Get 2 Bludgeon pieces", "No stacking Unsired: they must be received during the bingo."],
  ["Woodcutting", "1m Woodcutting xp"],
  ["Runecrafting", "1m Runecrafting xp"],
  ["Mining", "1m Mining xp"],
  ["Agility", "1m Agility xp", "No stacking Brimhaven Agility Arena tickets: tickets must be earned during the bingo."],
  ["Sailing!!!!", "2m Sailing xp"],
  ["Buttplug", "Get a Masterwand or Mage's Book", "Masterwand must be built from scratch. You can't have Pizazz points banked in any category that is a requirement for buying any non-rune item."],
  ["Twinflame", "Get both Twinflame staff pieces"],
  ["What are those???", "Get a Medium Clue boots reward", CLUE_STACK],
  ["Ironman", "Get a Zombie Helmet, Axe, and Warped Sceptre"],
  ["Hawk Cluah", "Get a Dragon Mask from an Elite Clue or Demon Mask from a Master Clue", CLUE_STACK],
  ["EZ", "Get a Ham Joint or Flared Trousers from an Easy Clue", CLUE_STACK],
  ["GG", "Get a GGs Unique", "Dust and maul don't count as the unique."],
  ["Yet another Forgotten 4", "Any piece of virtus"],
  ["Bookworm", "Get any Tome", "No stacking searches: they must be earned during the bingo."],
  ["Boss Pet", "Get any Boss Pet", "Beef and the Chaos Elemental pet don't count."],
  ["Skilling Pet", "Get any Skilling Pet", "The Chompy chick pet doesn't count."],
  ["PMs", "Get one drop from each Moon", "No preloading: you can't have a chest ready to go and open it as soon as the bingo starts."],
  ["ToB", "Get a ToB purple"],
  ["CoX", "Get a CoX purple"],
  ["ToA", "Get a ToA purple"],
  ["Mad Angel", "Get a Mad Angel unique", "Teleports and dust don't count."],
  ["Synapse", "Get a Synapse"],
  ["Maggot King", "Get a Maggot King Unique", "Only the pet, Elder Fang, or Crimson Kisten count."],
  ["GotR", "Get two of: Dye, Lantern, Abyssal Needle, Pet", "No stacking, and you can't buy the item using abyssal pearls."],
  ["We <3 Sailing!", "Get EITHER Drag Cannon or Salvaging Hook AND Bottled Storm"],
  ["We <3 Trawling!", "Get 1 of any Trawling Big Fish"],
  ["Giants", "Get Bryo Essence or Giants Club", "No stacking keys: they must be earned during the bingo."],
  ["Capybara Gaming", "Get Fletching Knife, Jewellers Chisel, and Prescription Goggles/Storage", "Can't stack offerings, can't buy the knife with research points, can't stack Mixology resin (be reasonable)."],
  ["Hydra", "Any Hydra unique", "Must be dropped by the boss itself."],
  ["Sailing PvM", "Get a Shellbane unique + Horn of Plenty OR Aquanite Tendon"],
  ["Elf Style", "Pickpocket an Enhanced Crystal Teleport Seed"],
  ["Zealot", "Get full Zealot Robes"],
  ["Sceptre", "Pharoah's Sceptre"],
]);

export const CHUNGUS = std("chungus", [
  ["Rare Clue", "Get a Rare Clue drop", `${CLUE_STACK} Counts: 3rd Age, Gilded, Ring of Coins/Nature, Monk's Robe (g), lava dragon mask, any tux piece, drag kite or platebody orn kit, bloodhound, mummy and ankou, dhide shields.`],
  ["Back to GWD", "Get a unique (not Godsword Shard) from each GWD Boss excluding Nex"],
  ["Dragon Warrior", "Get a Dragon Full Helm, Dragon Metal Lump, or Dragon Metal Slice", "No stacking chewed bones."],
  ["Capes", "Complete 1x Inferno or 2x Colo or 5x Fight Caves", "Can't be mid-run when the bingo starts."],
  ["Nightmare", "Any Nightmare unique", "Any unique except the tablet."],
  ["Money Maker", "Get an Amulet of Eternal Glory"],
  ["Superior Slayer", "Get an Imbued Heart or Eternal Slayer Gem"],
  ["Autism Complete", "Get a Soulreaper Axe", "You have to get all 4 drops during the bingo (pooled across the team). Nothing bought."],
  ["Doom", "Get a glowie hole from Doom", "A dupe pet counts."],
  ["The Adam Task", "Get a Ring of Endurance"],
  ["Voidwaker", "Build a Voidwaker", "You have to get every drop during the bingo (pooled across the team). Nothing bought."],
  ["Paint", "Get Salvors, Anglers, Barracuda, or Inky Paint", "Must be dropped, not bought. No preloading: nothing banked before the bingo starts."],
]);

export const PRESTIGE = [
  ["Blood Torva", "Bandos Tassets or Chestplate", "Kill any Awakened Boss"],
  ["Ancient Ceremony", "Get 3 unique Ancient Ceremonial Robes", "Get a full set of Ancient Ceremonial"],
  ["Gauntleting", "Get 3 Armour and/or Weapon Seeds", "Get an Enhanced Seed", "No preloading: nothing banked or ready to open before the bingo starts."],
  ["Rev weapon", "Get a rev weapon upgrade", "Get the respective rev weapon"],
  ["Gone Fishing", "Golden Tench", "Any Fishing Utility drop from Tempoross", "Tempoross drops can't be bought. 25 pages counts as a dupe drop, so it counts."],
  ["Build-a-Godsword", "Get any God Hilt", "Get each Godsword piece"],
  ["Ed's Fave", "Get all DK rings", "Add a vestige to any of them", "Can just be 3 ring drops across the team. It doesn't physically need to be a vestige."],
  ["Barrows Bukkake", "Get a Barrows drop for each slot", "All from the same bro", "No preloading: nothing banked or ready to open before the bingo starts."],
  ["Dragonslayer 3", "Get a unique from Huey and Zulrah", "Get a Draconic/Skeletal Visage", "These don't count as uniques: seeds, soiled pages, hide, teleports, scales."],
  ["Purples", "Get any Raid Purple", "One from two different raids"],
  ["Spider Monkeys", "Get 2 Zenytes", "Araxyte Fang or Elder Venator Fang"],
  ["Tools of the Trade", "Get a Dragon Harpoon, Axe, and Pickaxe", "Get a Smouldering Stone"],
  ["Reddit", "Get Mole Slippers", "Get Holy Sandals"],
  ["Venator Bow", "Get 2 Venator Shards", "Get 3 Shards"],
  ["Really scary", "Make an Odium or Malediction Ward", "Make the other one", "You have to get each of the drops during the bingo (pooled across the team). Nothing bought."],
].map(([name, condition, prestige, rule]) => ({ id: `prestige:${slug(name)}`, kind: "prestige", name, condition, prestige, ...(rule ? { rule } : {}) }));

// `steps` is the number of ticks a task has (one point each). Ticks are stored per step.
export const INCREMENTAL = [
  ["Noob Weapons", "Leafbladed Weapon, Trident of Sea, Brine Sabre, G Maul, G Sword", 5],
  ["Demonslayer", "Abyssal Whip, Abyssal Dagger, Synapse, Burning Claw, Zalcano Shard", 5],
  ["Fury Warrior", "Sulphur Blades, Glacial Temotli, Dual Macuahuitl, Earthbound Tecpatl", 4],
  ["Autism in Progress", "Get each piece of the Soulreaper Axe", 4],
  ["Lord of the Rings pt 2", "Callisto, Vetion, Venenatis Ring", 3],
  ["Slops", "Any item that can be mounted on a Head display and Araxyte head", 7],
  ["Monkeys", "Each monkey backpack", 6, "Scored on the laps you do during the bingo, not on actually claiming the item."],
].map(([name, condition, steps, rule]) => ({ id: `inc:${slug(name)}`, kind: "incremental", name, condition, steps, ...(rule ? { rule } : {}) }));

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
  { id: "pvp", title: "PvP", blurb: "3 / 2 / 1 points for 1st / 2nd / 3rd, awarded by the organiser. 1 PvP event a week on Sunday — starting with Duel Arena, LMS, and Clan Wars.", tasks: PVP },
];

/** Every tickable key a team may submit: `<task id>` for most tasks, `<id>#p` for the prestige part, `<id>#<n>` for steps. */
export function validKeys() {
  const keys = new Set();
  for (const t of [...STANDARD, ...CHUNGUS]) keys.add(t.id);
  for (const t of PRESTIGE) { keys.add(t.id); keys.add(`${t.id}#p`); }
  for (const t of INCREMENTAL) for (let i = 1; i <= t.steps; i++) keys.add(`${t.id}#${i}`);
  return keys;
}
