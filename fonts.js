const http = require('http');
const fs = require('fs');
const config = require('./options').fonts;

const variants = Object.keys(config.VARIANTS);
const agents = Object.keys(config.USER_AGENTS);
const lastFont = agents.length * variants.length * 2; //2 стиля шрифтов: normal, italic
const fontRegExp = /url\(([^\)]*?)\)/m;

let sourceMap = {}, sourceMapItalic = {};
let counterFonts = 0;

let rootDir = './fonts/'
let fontDir = rootDir + 'fonts/';
let scssDir = rootDir + 'scss/';

deleteDirSync(rootDir);

fs.stat(rootDir, (err, stats) => { 
    if (!stats) {
        fs.mkdir(rootDir);
        fs.stat(fontDir, (err, stats) => {  
            if (!stats) fs.mkdir(fontDir);
            else {
                fs.readdir(fontDir, (err, files) => {
                    for (let i = 0; i < files.length; i++) {
                        fs.unlink(fontDir + '/' + files[i]);
                    }
                });
            }
        });
        fs.stat(scssDir, (err, stats) => {  
            if (!stats) fs.mkdir(scssDir);
            else {
                fs.readdir(scssDir, (err, files) => {
                    for (let i = 0; i < files.length; i++) {
                        fs.unlink(scssDir + '/' + files[i]);
                    }
                });
            }
        });
    }
});

for (let i = 0; i < variants.length; i++) {
    let fontFamily = config.FAMILY + '-' + config.VARIANTS[variants[i]];
    let fontFamilyItalic = config.FAMILY + '-' + config.VARIANTS[variants[i]] + 'italic';

    sourceMap[fontFamily] = {};
    sourceMapItalic[fontFamilyItalic] = {};
    sourceMap[fontFamily].weight = sourceMapItalic[fontFamilyItalic].weight = variants[i];

    sourceMap[fontFamily].style = config.VARIANTS[variants[i]];
    sourceMapItalic[fontFamilyItalic].style = config.VARIANTS[variants[i]] + 'Italic';
    
    for (let k = 0; k < agents.length; k++) {
        getResponce(variants[i], agents[k], sourceMap, fontFamily);
        getResponce(variants[i], agents[k], sourceMapItalic, fontFamilyItalic, 'Italic');
    }
}

function deleteDirSync(dir) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (err) {
        return;
    }
    for (let i = 0; i < files.length; i++) {
        let stat = fs.statSync(dir + files[i]);
        if (stat.isFile()) {
            fs.unlinkSync(dir + files[i]);
        } else if (stat.isDirectory()) {
            deleteDirSync(dir + files[i] + '/');
        }
    }  
    fs.rmdirSync(dir); 
}

function getResponce(idVariant, idFormat, sourceMapLocal, fontFamily, style) {
    style = style || '';

    req = http.request({
        hostname: 'fonts.googleapis.com',
        method: 'GET',
        port: 80,
        path: '/css?family=' + config.FAMILY + ":" + config.VARIANTS[idVariant] + style + '&subset=' + config.SUBSETS,
        headers: {
            'User-Agent': config.USER_AGENTS[idFormat]
        }
    }, (res) => {
        let output = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            output += chunk;
        });
        res.on('end', () => {
            let result = fontRegExp.exec(output) ? fontRegExp.exec(output)[1] : null;
            let fontname = config.FAMILY.toLowerCase() + '-' + config.VARIANTS[idVariant].toLowerCase() + style.toLowerCase();
            if (result) {
                let filename;

                if (idFormat === 'svg') {
                    filename = (/kit=(.*?)&/).exec(result)[1] + '.svg';
                } else {
                    filename = (/v16\/(.*)/).exec(result)[1];
                }
                
                http.get(result, (res) => {
                    let error;
                    if (res.statusCode !== 200) {
                        error = new Error(`Request failed. Status code: ${res.statusCode}`)
                    }

                    if (error) {
                        console.log(error.message);
                        res.resume;
                        return;
                    }

                    res.setEncoding('utf8');
                    let rawData = '';
                    res.on('data', (chunk) => rawData += chunk);
                    res.on('end', () => {
                        let stream = fs.createWriteStream(fontDir + filename);
                        stream.write(new Buffer(rawData));
                        stream.end();
                    });
                });

                sourceMapLocal[fontFamily][idFormat] = filename;
                counterFonts++;
                if (counterFonts === lastFont) {
                    writeScss(sourceMap);
                    writeScss(sourceMapItalic, 'italic');
                }
            }
        });
    });
    req.end();
}

function writeScss(sourceMap, style) {
    fontArr = Object.keys(sourceMap);
    for (let i = 0; i < fontArr.length; i++) {
        let scss = `@font-face {\n\tfont-family:"${fontArr[i]}";\n`;
        let fontFamilyArr = Object.keys(sourceMap[fontArr[i]]);
        for (let k = 0; k < fontFamilyArr.length; k++) {
            if(fontFamilyArr[k] === 'weight' || fontFamilyArr[k] === 'style') continue;
            scss += `\tsrc: url("../fonts/${sourceMap[fontArr[i]][fontFamilyArr[k]]}") format("${fontFamilyArr[k]}");\n`
        }

        // let style;
        if (!style) style = 'normal';

        scss += `\tfont-weight: ${sourceMap[fontArr[i]].weight};\n\tfont-style: ${style};\n}`;
        fontname = fontArr[i].toLowerCase();
        fs.writeFile(scssDir + fontname + '.scss', scss);
        fs.appendFile(scssDir + 'roboto.scss', `@import "${fontname}";\n`)
    }
}