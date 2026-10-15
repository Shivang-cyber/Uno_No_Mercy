import type { AvatarConfig } from '../../shared/avatar'

// Prebuilt characters shown in the editor's Presets tab.
//
// To add one: build it in the editor, press "Copy as preset", paste the entry below.
// Face photos live in public/avatars/faces/ and are referenced as '/avatars/faces/<file>.jpg'.
// Optional reaction photos (shown while that reaction plays):
//   photoMoods: { smug: '...', shock: '...', gloom: '...', celebrate: '...', tantrum: '...' }

export interface Preset {
  name: string
  avatar: AvatarConfig
}

// Samples to show the format; replace with your own.
export const PRESETS: Preset[] = [
  {
    name: 'Sample: Captain',
    avatar: { skin: '#e8b98f', head: 'square', hair: 'short', hairColour: '#3b2a1a', eyes: 'sharp', brows: 'thick', mouth: 'grin', shirt: '#2c3e9e', extra: 'cap' },
  },
  {
    name: 'Sample: Night Owl',
    avatar: { skin: '#f6d3b3', head: 'oval', hair: 'long', hairColour: '#1f1a17', eyes: 'sleepy', brows: 'arched', mouth: 'small', shirt: '#8e44ad', extra: 'headphones' },
  },
  {
    name: 'Sample: Prof',
    avatar: { skin: '#c98f62', head: 'round', hair: 'bald', hairColour: '#9c9c9c', eyes: 'round', brows: 'flat', mouth: 'smile', shirt: '#16a085', extra: 'glasses' },
  },
]
