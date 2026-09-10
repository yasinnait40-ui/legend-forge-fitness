const fs = require('fs');
const path = require('path');

// البحث عن الملف المسؤول عن صفحة الساحر وتعديل الشرط تلقائياً
function patchArcaneGuide() {
    const pagesDir = path.join(process.cwd(), 'src', 'pages');
    if (!fs.existsSync(pagesDir)) return;

    const files = fs.readdirSync(pagesDir);
    files.forEach(file => {
        if (file.includes('ArcaneGuide') || file.includes('Guide')) {
            const filePath = path.join(pagesDir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            // إزالة نص الحظر وإجبار الـ AI على العمل في كل مكان
            if (content.includes('web realm only')) {
                content = content.replace(/web realm only/g, 'mobile app ready');
                // إلغاء تفعيل شرط الحظر البرمجي بجعله دائماً True للتشغيل
                content = content.replace(/isWeb\s*=\s*[^;]+/g, 'isWeb = true');
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Successfully patched AI in: ${file}`);
            }
        }
    });
}

patchArcaneGuide();

