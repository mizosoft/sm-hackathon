/** Fallback task templates with interactive challenges. */

import type { TaskChallenge } from '../core/types.js';

export interface TaskTemplate {
  name: string;
  description: string;
  category: string;
  challenge: TaskChallenge;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  // ── Investigation tasks (6) ──
  {
    name: 'Decode the inscription in {room}',
    description: 'Strange symbols are carved into the wall. Decode them to reveal a hidden message.',
    category: 'investigation',
    challenge: {
      type: 'unscramble',
      prompt: 'Unscramble this word found carved in the wall: "THOGS"',
      answer: 'ghost',
      hints: ['It haunts this house...', 'Starts with "G"'],
      flavorText: 'You trace the grooves in the stone. The letters rearrange in your mind...',
    },
  },
  {
    name: 'Sort the papers in {room}',
    description: 'Scattered documents hide a secret. Put the clue together.',
    category: 'investigation',
    challenge: {
      type: 'riddle',
      prompt: 'The torn papers form a riddle: "I have keys but no locks. I have space but no room. You can enter but can\'t go inside. What am I?"',
      answer: 'keyboard',
      hints: ['You use one every day', 'It has letters on it'],
      flavorText: 'You piece together the torn fragments. A riddle emerges from the scattered pages...',
    },
  },
  {
    name: 'Search for a key in {room}',
    description: 'A locked door nearby needs a key. Solve the lockbox puzzle.',
    category: 'investigation',
    challenge: {
      type: 'sequence',
      prompt: 'The lockbox has a number sequence. What comes next? 2, 6, 12, 20, ?',
      answer: '30',
      hints: ['The differences increase by 2 each time', 'Differences: 4, 6, 8, ...'],
      flavorText: 'The lockbox has rotating dials. A sequence of numbers is etched on the lid...',
    },
  },
  {
    name: 'Read the spirit board in {room}',
    description: 'The planchette is moving on its own. Decode the ghost\'s message.',
    category: 'investigation',
    challenge: {
      type: 'unscramble',
      prompt: 'The spirit board spells jumbled letters: "TRUNES"',
      answer: 'unrest',
      hints: ['The ghost feels this way', 'Opposite of peace'],
      flavorText: 'The planchette glides across the board, stopping at letters one by one...',
    },
  },
  {
    name: 'Examine the old photograph in {room}',
    description: 'A faded photograph is tucked into a frame. Something is hidden on the back.',
    category: 'investigation',
    challenge: {
      type: 'riddle',
      prompt: 'Written on the back: "The more you take, the more you leave behind. What am I?"',
      answer: 'footsteps',
      hints: ['Think about walking', 'You make them when you move'],
      flavorText: 'You flip over the deteriorating photograph. Elegant handwriting covers the back...',
    },
  },
  {
    name: 'Translate the runes in {room}',
    description: 'Strange runes glow faintly on the floor. Translate the ancient message.',
    category: 'investigation',
    challenge: {
      type: 'word-puzzle',
      prompt: 'The runes translate to letters with gaps: "D _ _ T H". Fill in the missing letters.',
      answer: 'ea',
      hints: ['Something inevitable...', 'The grim reaper brings this'],
      flavorText: 'The glowing runes pulse slowly, like a heartbeat. You begin to decipher them...',
    },
  },
  // ── Repair tasks (5) ──
  {
    name: 'Fix the wiring in {room}',
    description: 'The lights keep flickering. Reconnect the correct wires.',
    category: 'repair',
    challenge: {
      type: 'choice',
      prompt: 'Three wires are disconnected: Red, Blue, and Green. The manual says: "Never connect red first. Blue must come before green." Which wire do you connect FIRST?',
      answer: 'blue',
      hints: ['Red can\'t be first...', 'Blue must come before green, so...'],
      flavorText: 'The electrical panel sparks. Three frayed wires dangle in the darkness...',
    },
  },
  {
    name: 'Board up the window in {room}',
    description: 'A broken window lets in an eerie breeze. Figure out the board lengths.',
    category: 'repair',
    challenge: {
      type: 'sequence',
      prompt: 'The boards are numbered. To seal the window properly, what comes next? 1, 1, 2, 3, 5, 8, ?',
      answer: '13',
      hints: ['Each number is the sum of the two before it', 'This is a famous sequence...'],
      flavorText: 'Wind howls through the broken glass. You line up the boards...',
    },
  },
  {
    name: 'Repair the music box in {room}',
    description: 'The music box is jammed. Solve its mechanism.',
    category: 'repair',
    challenge: {
      type: 'riddle',
      prompt: 'Engraved on the music box: "I follow you everywhere but cannot be caught. I disappear in darkness but return with light. What am I?"',
      answer: 'shadow',
      hints: ['You see one on a sunny day', 'It\'s always behind you'],
      flavorText: 'The music box is ornate and old. An inscription wraps around its base...',
    },
  },
  {
    name: 'Restore the grandfather clock in {room}',
    description: 'The clock has stopped. Set the correct time by solving the mechanism.',
    category: 'repair',
    challenge: {
      type: 'sequence',
      prompt: 'The clock chimes in a pattern: 1, 4, 9, 16, ?. What chime comes next?',
      answer: '25',
      hints: ['These are perfect squares', '1², 2², 3², 4², ...'],
      flavorText: 'The pendulum hangs still. A sequence of worn numbers is etched into the brass face...',
    },
  },
  {
    name: 'Mend the broken banister in {room}',
    description: 'The banister is splintered. Choose the right tool to fix it.',
    category: 'repair',
    challenge: {
      type: 'choice',
      prompt: 'Three tools hang on the wall: a Hammer, a Saw, and Wood Glue. The note says: "Forcing won\'t work. Cutting makes it worse. What bonds is best." Which tool?',
      answer: 'wood glue',
      hints: ['Forcing = hammer, cutting = saw...', '"What bonds" — something sticky'],
      flavorText: 'The bannister creaks dangerously. Tools are arranged on the wall with a cryptic instruction...',
    },
  },
  // ── Survival tasks (5) ──
  {
    name: 'Light the fireplace in {room}',
    description: 'Get the fire going. The matches are labelled with a puzzle.',
    category: 'survival',
    challenge: {
      type: 'riddle',
      prompt: 'The matchbox reads: "I am not alive, but I grow. I don\'t have lungs, but I need air. I don\'t have a mouth, but water kills me. What am I?"',
      answer: 'fire',
      hints: ['Think about what you\'re trying to create', 'It burns...'],
      flavorText: 'The fireplace is cold. A dusty matchbox sits on the mantle with writing on it...',
    },
  },
  {
    name: 'Inventory the supplies in {room}',
    description: 'Count what provisions remain. The storage code is locked.',
    category: 'survival',
    challenge: {
      type: 'word-puzzle',
      prompt: 'The supply cabinet has a letter lock. Fill in the blank: "All that GL_TTERS is not G_LD." Type the two missing letters together.',
      answer: 'io',
      hints: ['It\'s a famous saying...', '"GLITTERS" and "GOLD"'],
      flavorText: 'Canned food and water bottles are locked behind glass. A letter puzzle guards the latch...',
    },
  },
  {
    name: 'Barricade the door in {room}',
    description: 'Something is scratching at the door. You need to solve the lock combination.',
    category: 'survival',
    challenge: {
      type: 'sequence',
      prompt: 'The combination lock has a pattern: A=1, C=3, F=6, J=10, ?=? What letter comes next?',
      answer: 'o',
      hints: ['The differences are 2, 3, 4, 5...', 'The 15th letter of the alphabet'],
      flavorText: 'Scratching sounds come from behind the door. The deadbolt has a letter combination...',
    },
  },
  {
    name: 'Purify the water basin in {room}',
    description: 'The water is murky and foul. Solve the filtration puzzle to cleanse it.',
    category: 'survival',
    challenge: {
      type: 'choice',
      prompt: 'Three filters are available: Charcoal, Sand, and Cloth. The basin\'s inscription says: "Born from fire, I cleanse all." Which filter?',
      answer: 'charcoal',
      hints: ['What is "born from fire"?', 'Used in water purification for centuries'],
      flavorText: 'Dark water fills the stone basin. Three filters sit on the ledge beside an ancient inscription...',
    },
  },
  {
    name: 'Seal the draughty chimney in {room}',
    description: 'An icy wind howls down the chimney. Block it off properly.',
    category: 'survival',
    challenge: {
      type: 'riddle',
      prompt: 'Etched into the mantle: "I have cities but no houses. I have mountains but no trees. I have water but no fish. What am I?"',
      answer: 'map',
      hints: ['Think abstractly — not a real place', 'You use it to navigate'],
      flavorText: 'Frost creeps down the chimney stones. Enigmatic words are carved into the mantle...',
    },
  },
  // ── Cleaning tasks (4) ──
  {
    name: 'Dust the shelves in {room}',
    description: 'Clear away the cobwebs to reveal a hidden message.',
    category: 'cleaning',
    challenge: {
      type: 'unscramble',
      prompt: 'Under the dust, letters are scratched into the shelf: "PCEEAS"',
      answer: 'escape',
      hints: ['What you\'re trying to do!', 'Six letters, starts with E'],
      flavorText: 'You wipe away decades of dust. Letters appear beneath, scratched by desperate fingernails...',
    },
  },
  {
    name: 'Clean the mirror in {room}',
    description: 'The fogged mirror seems to hide a message written backwards.',
    category: 'cleaning',
    challenge: {
      type: 'word-puzzle',
      prompt: 'The mirror shows reversed text: "PLEH". What does it say?',
      answer: 'help',
      hints: ['Read it backwards', 'Someone is asking for assistance'],
      flavorText: 'You breathe on the antique mirror. Letters appear in the fog, but reversed...',
    },
  },
  {
    name: 'Sweep the {room} floor',
    description: 'Debris hides a floor tile puzzle.',
    category: 'cleaning',
    challenge: {
      type: 'choice',
      prompt: 'Under the debris, three floor tiles are loose. They are marked: 🌙 ⭐ ☀️. A plaque reads: "Step on what comes between night and day." Which tile?',
      answer: 'star',
      hints: ['Between the moon and sun...', 'It shines at twilight'],
      flavorText: 'You sweep away the rubble. Three tiles glow faintly beneath...',
    },
  },
  {
    name: 'Scrub the stained glass in {room}',
    description: 'Grime covers a stained glass window. Clean it to reveal the hidden image.',
    category: 'cleaning',
    challenge: {
      type: 'unscramble',
      prompt: 'As you scrub, colored letters appear: "PRTSII"',
      answer: 'spirit',
      hints: ['Related to what haunts this house', 'Six letters, starts with S'],
      flavorText: 'You rub the grime from the colored glass. Letters materialize in the light...',
    },
  },
];
