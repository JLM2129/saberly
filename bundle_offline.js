const fs = require('fs');
const path = require('path');

const preguntasDir = path.join(__dirname, 'backend', 'preguntas');
const files = ['ciencias_naturales.json', 'lectura_critica.json', 'matematicas.json', 'sociales.json'];

let bundle = {};

files.forEach(file => {
    const filePath = path.join(preguntasDir, file);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        bundle[data.nombre.toLowerCase()] = data;
    }
});

const outputDir = path.join(__dirname, 'frontend', 'src', 'offline');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'questions_data.js');
const jsContent = `// Archivo generado automáticamente para soporte offline
export const OFF_QUESTIONS_DATA = ${JSON.stringify(bundle, null, 2)};
`;

fs.writeFileSync(outputPath, jsContent);
console.log('Bundle offline creado exitosamente en:', outputPath);
