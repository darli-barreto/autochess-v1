import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const modelMap: Record<string, string> = {};
  const searchDirs = [
    path.join(process.cwd(), 'public', 'champs-3d'),
    path.join(process.cwd(), 'champs-3d'),
  ];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.glb') || file.endsWith('.gltf')) {
            // Extract champion key, e.g. "zyra_(tft_set_18).glb" -> "zyra", "yunara_(tft_set_18).glb" -> "yunara"
            const lower = file.toLowerCase();
            const cleanName = lower
              .replace(/_\(tft_set_\d+\)/g, '')
              .replace(/\(tft_set_\d+\)/g, '')
              .replace(/_set_\d+/g, '')
              .replace(/\.glb|\.gltf/g, '')
              .trim()
              .replace(/[^a-z0-9]/g, '');

            const url = `/api/champions-3d/${encodeURIComponent(file)}`;
            if (cleanName) {
              modelMap[cleanName] = url;
            }
            // Also store exact raw name without extension
            const rawBase = file.replace(/\.glb|\.gltf/gi, '').toLowerCase();
            modelMap[rawBase] = url;
          }
        }
      } catch (err) {
        console.error('Error scanning 3D models directory:', err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    models: modelMap,
  });
}
