/** Fallback clue templates.
 *
 * Templates use the following placeholders:
 *   {room}   – room where the clue was found
 *   {ghost}  – ghost name
 *   {trait}  – one of the ghost / possessed player's traits
 *   {task}   – name of the completed task
 *
 * pointsToPossessed=true  → narrows the suspicion toward the possessed
 * pointsToPossessed=false → misdirection / narrative flavour
 */

import type { ClueType } from '../core/types.js';

export interface ClueTemplate {
  text: string;
  pointsToPossessed: boolean;
  type: ClueType;
}

export const CLUE_TEMPLATES: ClueTemplate[] = [
  // ─── Behavioral clues (point to possessed) ────────────────
  { text: 'While completing "{task}" you sense the ghost is drawn to someone {trait}. Watch for that quality.', pointsToPossessed: true, type: 'behavioral' },
  { text: 'A spectral whisper hisses: "The one I chose shares my {trait} nature…"', pointsToPossessed: true, type: 'behavioral' },
  { text: 'You notice strange marks near {room}. They seem to appear only when someone {trait} is close.', pointsToPossessed: true, type: 'behavioral' },
  { text: 'The ghost {ghost} seems agitated when a {trait} person enters the room.', pointsToPossessed: true, type: 'behavioral' },
  { text: 'A pages flips open on its own: "My vessel is {trait}, just like me."', pointsToPossessed: true, type: 'behavioral' },
  { text: 'Completing "{task}" reveals a pattern — the possessed acts {trait} even when no one is looking.', pointsToPossessed: true, type: 'behavioral' },
  { text: 'Cold air follows the one who is {trait}. Pay attention during discussions.', pointsToPossessed: true, type: 'behavioral' },

  // ─── Environmental clues (point to possessed) ─────────────
  { text: 'The temperature drops sharply in {room}. {ghost}\'s presence grows near someone with a {trait} temperament.', pointsToPossessed: true, type: 'environmental' },
  { text: 'Scratches on the wall in {room} spell fragments of the word "{trait}".', pointsToPossessed: true, type: 'environmental' },
  { text: 'Completing "{task}" disturbs the dust. Footprints leading away belong to someone {trait}.', pointsToPossessed: true, type: 'environmental' },
  { text: 'The mirror in {room} briefly flickers showing a {trait} silhouette standing behind you.', pointsToPossessed: true, type: 'environmental' },

  // ─── Ghostly clues (point to possessed) ───────────────────
  { text: '{ghost} materialises for an instant. It reaches toward the most {trait} person in the group.', pointsToPossessed: true, type: 'ghostly' },
  { text: 'The ghost was driven by {ghost}\'s motive. It possesses someone who is {trait} — be wary.', pointsToPossessed: true, type: 'ghostly' },
  { text: 'An eerie wail in {room}: "I need a {trait} soul to carry out my will…"', pointsToPossessed: true, type: 'ghostly' },
  { text: 'After finishing "{task}", you hear {ghost} whisper: "My host is {trait}… you cannot save them."', pointsToPossessed: true, type: 'ghostly' },

  // ─── Task-reward clues (point to possessed) ───────────────
  { text: 'Hidden behind the "{task}" station, a note reads: "Trust not the {trait} one."', pointsToPossessed: true, type: 'task-reward' },
  { text: 'Solving "{task}" reveals glowing text: "The possessed walks among you, bearing the mark of {trait}."', pointsToPossessed: true, type: 'task-reward' },
  { text: 'A journal page surfaces near {room}: "The ghost chose someone {trait} as its vessel."', pointsToPossessed: true, type: 'task-reward' },

  // ─── Misdirection / false clues ───────────────────────────
  { text: 'The {room} feels calm — whoever is here seems trustworthy for now.', pointsToPossessed: false, type: 'environmental' },
  { text: 'An old diary says: "The most cautious are often the most dangerous." Or is that a red herring?', pointsToPossessed: false, type: 'task-reward' },
  { text: '{ghost} laughs faintly. "Maybe the danger is somewhere else entirely…"', pointsToPossessed: false, type: 'ghostly' },
  { text: 'A helpful note found after "{task}": "Courage and goodwill still exist in this house."', pointsToPossessed: false, type: 'task-reward' },
  { text: 'Nothing unusual here. The room feels peaceful for now.', pointsToPossessed: false, type: 'environmental' },
  { text: 'A completed task reveals a hidden note: "Trust the one who helps others."', pointsToPossessed: false, type: 'task-reward' },
];
