import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

// 引数から watch モードかどうかを判定
const isWatch = process.argv.includes('--watch');

// テキストファイルからマイクラ側のメインのコピー先アドレスを取得
let copyDestination = '';
try {
  const addressPath = path.join('build', 'copyAddress_main.js.txt');
  copyDestination = fs.readFileSync(addressPath, 'utf-8').trim();
} catch (error) {
  console.error('[Error] build\\copyAddress_main.js.txt の読み込みに失敗しました。');
  process.exit(1);
}

// フォルダを丸ごと再帰的にコピーする関数（Node.js標準機能・コンソール表示付き）
function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  const elements = fs.readdirSync(from);
  for (const element of elements) {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    
    // 不要なファイルや、生成された main.js が二次ループで上書きコピーされるのを防ぐ除外設定
    if (element === 'node_modules' || element === 'build_scripts' || element === '.git' || element === 'main.js' || element === 'main.js.map') {
      continue;
    }
    
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
      console.log(`  [Copy] ${fromPath} -> ${toPath}`);
    }
  }
}

// esbuild の共通設定
const config = {
  entryPoints: ['build/build_scripts/main.source.js'], 
  bundle: true,
  minify: !isWatch, 
  sourcemap: true,
  platform: 'neutral',
  target: 'es2020',
  external: ['@minecraft/server'],
  
  // 出力先を作意的にマイクラ側の絶対パスへ直接指定
  outfile: copyDestination, 
  
  plugins: [{
    name: 'sync-all-assets',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) {
          try {
            // 文字列分割のバグを完全に修正。path.normalizeを使って com.mojang の位置を厳密に特定します
            const index = copyDestination.replace(/\\/g, '/').indexOf('com.mojang');
            if (index === -1) throw new Error('パスの中に com.mojang が見つかりません。');
            const bpTargetDir = path.dirname(path.dirname(copyDestination));
            const rpTargetDir = path.normalize(bpTargetDir.replace('development_behavior_packs', 'development_resource_packs'));
            const comMojangRoot = path.dirname(bpTargetDir);

            // 【ビヘイビアパックの全ファイル同期（JSON等）】
            const bpSrcDir = fs.existsSync('development_behavior_packs/PVPbot') ? 'development_behavior_packs/PVPbot' : 'development_behavior_packs/pvpbot';
            copyFolderSync(bpSrcDir, bpTargetDir);

            // 【リソースパックの全ファイル同期（テクスチャ・JSON等）】
            const rpSrcDir = fs.existsSync('development_resource_packs/PVPbot') ? 'development_resource_packs/PVPbot' : 'development_resource_packs/pvpbot';
            copyFolderSync(rpSrcDir, rpTargetDir);

            console.log(`\n[Success] esbuildがマイクラ側のフォルダへ直接 main.js を生成し、全面同期が完了しました！`);
          } catch (err) {
            console.error(`[Error] マイクラ側への自動同期に失敗しました: ${err.message}`);
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
  console.log('[Watch] 監視システム起動...（保存すると直接マイクラ側へビルド＆同期されます）');
} else {
  await esbuild.build(config);
}
