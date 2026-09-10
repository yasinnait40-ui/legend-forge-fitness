import * as fs from 'fs';
import * as path from 'path';

function patchArcaneGuide() {
    const pagesDir = path.join(process.cwd(), 'src', 'pages');
    if (!fs.existsSync(pagesDir)) return;

    const files = fs.readdirSync(pagesDir);
    files.forEach(file => {
        if (file.includes('ArcaneGuide') || file.includes('Guide')) {
            const filePath = path.join(pagesDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('web realm only')) {
                content = content.replace(/web realm only/g, 'mobile app ready');
                content = content.replace(/isWeb\s*=\s*[^;]+/g, 'isWeb = true');
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Successfully patched AI in: ${file}`);
            }
        }
    });
}

patchArcaneGuide();
