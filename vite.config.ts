import { cp } from 'node:fs/promises';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

import { scriptPlugin } from './src/tools/compile-script';

/**
 * `assets/` 는 `public/` 밖에 있습니다 (TECH_DESIGN 2절).
 *
 * 런타임에 URL 로 읽는 파일들이라 번들에 들어가면 안 되고, 그렇다고 `public/`
 * 으로 옮기면 `tools/tilegen` 의 출력 경로와 문서 링크가 전부 어긋납니다.
 * 그래서 개발 서버에서는 미들웨어로 흘려보내고, 빌드 때는 `dist/` 로 복사합니다.
 */
const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.json': 'application/json',
  '.tsj': 'application/json',
};

function serveAssets(): Plugin {
  const root = resolve(import.meta.dirname, 'assets');
  return {
    name: 'junglover-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res) => {
        const rel = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]));
        const file = join(root, rel);
        // 없는 에셋은 404 로 끊습니다. 그냥 next() 로 넘기면 SPA 폴백이 HTML 을
        // 200 으로 돌려줘서, 게임이 수백 장을 읽을 때 무엇이 빠졌는지 안 보입니다.
        // `..` 로 assets/ 밖을 읽는 것도 여기서 막힙니다.
        if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(`에셋 없음: ${rel}`);
          return;
        }
        res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
    async closeBundle() {
      await cp(root, resolve(import.meta.dirname, 'dist/assets'), {
        recursive: true,
        // 임시 폴더는 배포에 싣지 않습니다 (assets/temp/README.md)
        filter: (src) => !src.startsWith(join(root, 'temp')),
      });
    },
  };
}

export default defineConfig({
  // 상대 경로라 어느 하위 경로에 올려도 그대로 돕니다 — Pages 의 `/<저장소 이름>/` 포함.
  // 개발 서버에서는 Vite 가 알아서 `/` 로 둡니다.
  base: './',
  publicDir: 'public',
  plugins: [serveAssets(), scriptPlugin()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    // 번들 산출물은 dist/build/ 로 — 위에서 통째로 복사하는 dist/assets/ 와 섞이면 안 됩니다
    assetsDir: 'build',
  },
});
