const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // Bundle client-side JS
  // Only build if entry point exists
  if (fs.existsSync('src/client/main.js')) {
      await esbuild.build({
        entryPoints: ['src/client/main.js'],
        bundle: true,
        minify: true,
        outfile: 'dist/script.temp.js',
        format: 'iife',
        target: 'es2015',
      });

      // Wrap in <script> tag and write to script.html
      const js = fs.readFileSync('dist/script.temp.js', 'utf8');
      fs.writeFileSync('dist/script.html', `<script>\n${js}\n</script>`);
      fs.unlinkSync('dist/script.temp.js');
      console.log('📦 Bundled client-side JS to dist/script.html');
  } else {
      console.log('⚠️ src/client/main.js not found, skipping client bundle.');
  }

  // Copy server-side files
  if (fs.existsSync('src/server')) {
      const copyRecursive = (dir) => {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
              const filePath = path.join(dir, file);
              const stat = fs.statSync(filePath);
              if (stat.isDirectory()) {
                  copyRecursive(filePath);
              } else if (file.endsWith('.js') || file.endsWith('.json')) {
                  // Flatten structure: copy all server js files to root of dist
                  fs.copyFileSync(filePath, path.join('dist', file));
              }
          });
      };
      copyRecursive('src/server');
      console.log(`📂 Copied server files to dist/`);
  }

  // Copy HTML templates
  if (fs.existsSync('src/templates')) {
      const templates = fs.readdirSync('src/templates');
      templates.forEach(file => {
        if (file.endsWith('.html')) {
            fs.copyFileSync(
            path.join('src/templates', file),
            path.join('dist', file)
            );
        }
      });
      console.log(`📄 Copied ${templates.length} templates to dist/`);
  }
  
  // Copy appsscript.json if it exists in src/server or src
  if (fs.existsSync('src/server/appsscript.json')) {
      fs.copyFileSync('src/server/appsscript.json', 'dist/appsscript.json');
  } else if (fs.existsSync('src/appsscript.json')) {
      fs.copyFileSync('src/appsscript.json', 'dist/appsscript.json');
  }

  console.log('✅ Build complete!');
}

build().catch(console.error);
