import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

// 引数から watch モードかどうかを判定
const isWatch = process.argv.includes('--watch');

// テキストファイルからコピー先のアドレス（絶対パス）を取得
let copyDestination = '';
try {
  const addressPath = path.join('build', 'copyAddress_main.js.txt');
  copyDestination = fs.readFileSync(addressPath, 'utf-8').trim();
} catch (error) {
  console.error('[Error] build\\copyAddress_main.js.txt の読み込みに失敗しました。');
  process.exit(1);
}

// esbuild の共通設定
const config = {
  entryPoints: ['build/build_scripts/main.source.js'],
  bundle: true,
  minify: !isWatch, // watch モードの時は軽量化せずデバッグしやすくする
  sourcemap: true,
  platform: 'neutral',
  target: 'es2020',
  external: ['@minecraft/server'],
  outfile: 'behavior_packs/PVPbot/scripts/main.js',
  plugins: [{
    name: 'copy-on-end',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) {
          try {
            // コピー先のディレクトリ（フォルダ）が存在しない場合は作成
            const destDir = path.dirname(copyDestination);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            // 生成されたファイルをテキストファイル記載の絶対パスへコピー
            fs.copyFileSync(config.outfile, copyDestination);
            console.log(`[Success] ビルド成功 → マイクラ側へ自動コピーしました！\n宛先: ${copyDestination}`);
          } catch (err) {
            console.error(`[Error] マイクラ側への自動コピーに失敗しました: ${err.message}`);
          }
        }
      });
    },
  }],
};

// 実行処理
if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('[Watch] ファイルの監視を開始しました...（コードを変更して保存すると自動でビルド＆コピーされます）');
} else {
  await esbuild.build(config);
}
