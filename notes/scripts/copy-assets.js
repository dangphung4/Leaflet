import { copyFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const assets = [
  'leaflet-maskable.png',
  'leaflet-maskable.svg',
  'demo.png',
  'dayview.png',
  'weekview.png',
  'agendaview.png',
  'note-maskable.png',
  'note-rounded.png',
  'note.svg',
  'note32.svg',
  'note144.svg',
  'note167.svg',
  'note180.svg',
  'note192.svg',
  'note512.svg',
  'note-maskable.svg',
]

const srcDir = resolve(__dirname, '../src/assets')
const destDir = resolve(__dirname, '../public/assets')

// Create destination directory if it doesn't exist
mkdirSync(destDir, { recursive: true })

// Copy each asset
assets.forEach(asset => {
  try {
    copyFileSync(
      resolve(srcDir, asset),
      resolve(destDir, asset)
    )
    console.log(`Copied ${asset} successfully`)
  } catch (error) {
    console.error(`Error copying ${asset}:`, error)
  }
}) 