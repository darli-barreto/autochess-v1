import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug).toLowerCase();
  const cleanTarget = decodedSlug.replace(/_\(tft_set_\d+\)/g, '').replace(/\.glb|\.gltf/g, '').trim().replace(/[^a-z0-9]/g, '');

  const searchDirs = [
    path.join(process.cwd(), 'public', 'champs-3d'),
    path.join(process.cwd(), 'champs-3d'),
  ];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        // 1. Check exact match
        for (const file of files) {
          if (file.toLowerCase() === decodedSlug || file.toLowerCase() === `${decodedSlug}.glb`) {
            const fileBuffer = fs.readFileSync(path.join(dir, file));
            return new NextResponse(fileBuffer, {
              headers: {
                'Content-Type': 'model/gltf-binary',
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            });
          }
        }

        // 2. Check clean name match (e.g. "ahri" -> "ahri_(tft_set_18).glb")
        for (const file of files) {
          const fileClean = file.toLowerCase().replace(/_\(tft_set_\d+\)/g, '').replace(/\.glb|\.gltf/g, '').trim().replace(/[^a-z0-9]/g, '');
          if (fileClean === cleanTarget && (file.endsWith('.glb') || file.endsWith('.gltf'))) {
            const fileBuffer = fs.readFileSync(path.join(dir, file));
            return new NextResponse(fileBuffer, {
              headers: {
                'Content-Type': 'model/gltf-binary',
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            });
          }
        }
      } catch (e) {
        console.error('Error searching GLB files in dir:', dir, e);
      }
    }
  }

  return new NextResponse('Model not found', { status: 404 });
}
