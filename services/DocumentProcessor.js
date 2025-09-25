const fs = require('fs').promises;
const path = require('path');
const OCRService = require('./ocrService');
const PDFService = require('./pdfService');
const GenericFileService = require('./genericFileService');

/**
 * 文档处理器 - 第五阶段：支持所有文件类型的处理
 * 支持文档、图片OCR、PDF处理和其他文件类型的元数据提取
 */
class DocumentProcessor {
    constructor() {
        this.supportedTypes = {
            txt: ['.txt'],
            excel: ['.xlsx', '.xls'],
            csv: ['.csv'],
            markdown: ['.md'],
            word: ['.docx', '.doc'],
            powerpoint: ['.pptx', '.ppt'],
            image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.heic', '.heif'],
            pdf: ['.pdf'],
            // 通用文件类型（由GenericFileService处理）
            audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus', '.amr'],
            video: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.f4v'],
            archive: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.lzma', '.cab', '.iso'],
            code: ['.js', '.html', '.css', '.jsx', '.vue', '.scss', '.sass', '.less', '.ts', '.ejs', '.htm', '.mhtml',
                   '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.hxx', '.php', '.rb', '.go', '.pyc',
                   '.sh', '.bash', '.zsh', '.fish', '.bat', '.ps1',
                   '.json', '.xml', '.yaml', '.yml', '.sql',
                   '.conf', '.config', '.ini', '.cfg', '.properties', '.env', '.toml', '.lock', '.sxcu'],
            design: ['.psd', '.psb', '.ai', '.sketch', '.dxf', '.dwg'],
            database: ['.db', '.sqlite', '.sqlite3', '.mdb', '.accdb'],
            log: ['.log', '.logs'],
            font: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
            plugin: ['.vsix', '.rbz'],
            debug: ['.pdb'],
            executable: ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.app', '.run', '.dll', '.so', '.dylib', '.apk']
        };

        // 延迟加载依赖
        this.xlsx = null;
        this.mammoth = null;
        this.marked = null;
        this.yauzl = null;

        // 处理服务
        this.ocrService = new OCRService();
        this.pdfService = new PDFService();
        this.genericFileService = new GenericFileService();
    }

    // 动态加载依赖
    async loadDependencies() {
        if (!this.xlsx) {
            this.xlsx = require('xlsx');
        }
        if (!this.mammoth) {
            this.mammoth = require('mammoth');
        }
        if (!this.marked) {
            const markedModule = await import('marked');
            this.marked = markedModule.marked;
        }
    }

    /**
     * 检查文件是否支持处理
     * @param {string} filePath 文件路径
     * @returns {boolean} 是否支持
     */
    isSupported(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return Object.values(this.supportedTypes).flat().includes(ext);
    }

    /**
     * 获取文件类型
     * @param {string} filePath 文件路径
     * @returns {string} 文件类型
     */
    getFileType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        for (const [type, extensions] of Object.entries(this.supportedTypes)) {
            if (extensions.includes(ext)) {
                return type;
            }
        }
        return 'unknown';
    }

    /**
     * 处理文档并提取内容
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 提取的内容信息
     */
    async processDocument(filePath) {
        try {
            // 确保依赖已加载
            await this.loadDependencies();

            // 检查文件是否存在
            const fs = require('fs').promises;
            try {
                await fs.access(filePath);
            } catch (error) {
                throw new Error(`文件不存在或无法访问: ${filePath}`);
            }

            const fileType = this.getFileType(filePath);
            const fileName = path.basename(filePath);

            console.log(`开始处理文档: ${fileName} (类型: ${fileType}, 路径: ${filePath})`);

            let content = '';
            let metadata = {};
            
            switch (fileType) {
                case 'txt':
                    ({ content, metadata } = await this.processTxtFile(filePath));
                    break;
                case 'excel':
                    ({ content, metadata } = await this.processExcelFile(filePath));
                    break;
                case 'csv':
                    ({ content, metadata } = await this.processCsvFile(filePath));
                    break;
                case 'markdown':
                    ({ content, metadata } = await this.processMarkdownFile(filePath));
                    break;
                case 'word':
                    ({ content, metadata } = await this.processWordFile(filePath));
                    break;
                case 'powerpoint':
                    ({ content, metadata } = await this.processPowerPointFile(filePath));
                    break;
                case 'image':
                    ({ content, metadata } = await this.processImageFile(filePath));
                    break;
                case 'pdf':
                    ({ content, metadata } = await this.processPdfFile(filePath));
                    break;
                case 'audio':
                case 'video':
                case 'archive':
                case 'code':
                case 'design':
                case 'database':
                case 'log':
                case 'font':
                case 'plugin':
                case 'debug':
                case 'executable':
                    ({ content, metadata } = await this.processGenericFile(filePath));
                    break;
                default:
                    throw new Error(`不支持的文件类型: ${fileType}`);
            }

            return {
                success: true,
                fileName,
                fileType,
                content: content.trim(),
                metadata,
                extractedAt: new Date().toISOString(),
                contentLength: content.length,
                summary: this.generateContentSummary(content)
            };

        } catch (error) {
            console.error(`处理文档失败: ${filePath}`, error);
            return {
                success: false,
                fileName: path.basename(filePath),
                error: error.message,
                extractedAt: new Date().toISOString()
            };
        }
    }

    /**
     * 处理TXT文件
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 内容和元数据
     */
    async processTxtFile(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        
        const metadata = {
            encoding: 'utf-8',
            lineCount: lines.length,
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
            charCount: content.length
        };

        return { content, metadata };
    }

    /**
     * 处理Excel文件
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 内容和元数据
     */
    async processExcelFile(filePath) {
        const workbook = this.xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;

        let content = '';
        const sheetsData = {};

        for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName];

            // 优化：只读取前10列数据以提高性能
            const jsonData = this.xlsx.utils.sheet_to_json(worksheet, {
                header: 1,
                range: this.getOptimizedRange(worksheet, 10) // 限制为前10列
            });

            // 提取表格内容为文本，限制每行只取前10列
            const sheetContent = jsonData
                .filter(row => row.length > 0)
                .map(row => row.slice(0, 10).join(' | ')) // 只取前10列
                .join('\n');

            sheetsData[sheetName] = {
                rowCount: jsonData.length,
                columnCount: Math.min(10, jsonData[0]?.length || 0),
                content: sheetContent,
                isOptimized: true // 标记为优化读取
            };

            content += `工作表: ${sheetName}\n${sheetContent}\n\n`;
        }

        const metadata = {
            sheetCount: sheetNames.length,
            sheetNames,
            sheetsData,
            optimized: true,
            maxColumns: 10
        };

        return { content, metadata };
    }

    /**
     * 获取优化的Excel读取范围（限制列数）
     * @param {Object} worksheet Excel工作表对象
     * @param {number} maxColumns 最大列数
     * @returns {string} Excel范围字符串
     */
    getOptimizedRange(worksheet, maxColumns = 10) {
        const range = this.xlsx.utils.decode_range(worksheet['!ref'] || 'A1');

        // 限制列数，但保持所有行
        const endCol = Math.min(range.e.c, maxColumns - 1);
        const optimizedRange = {
            s: { c: 0, r: range.s.r }, // 起始位置
            e: { c: endCol, r: range.e.r } // 结束位置，限制列数
        };

        return this.xlsx.utils.encode_range(optimizedRange);
    }

    /**
     * 处理CSV文件
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 内容和元数据
     */
    async processCsvFile(filePath) {
        const csvContent = await fs.readFile(filePath, 'utf-8');

        // 简单的CSV解析，支持常见的分隔符
        const lines = csvContent.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            return {
                content: '',
                metadata: { rowCount: 0, columnCount: 0, isEmpty: true }
            };
        }

        // 检测分隔符（优先级：逗号 > 分号 > 制表符）
        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length) {
            delimiter = ';';
        } else if (firstLine.includes('\t') && firstLine.split('\t').length > firstLine.split(',').length) {
            delimiter = '\t';
        }

        // 解析CSV数据，只取前10列以优化性能
        const rows = lines.map(line => {
            // 简单的CSV解析，处理引号包围的字段
            const fields = this.parseCSVLine(line, delimiter);
            return fields.slice(0, 10); // 只取前10列
        });

        // 生成内容文本
        const content = rows
            .map(row => row.join(' | '))
            .join('\n');

        const metadata = {
            rowCount: rows.length,
            columnCount: Math.min(10, rows[0]?.length || 0),
            delimiter,
            hasHeader: this.detectCSVHeader(rows),
            optimized: true,
            maxColumns: 10
        };

        return { content, metadata };
    }

    /**
     * 解析CSV行，处理引号包围的字段
     * @param {string} line CSV行
     * @param {string} delimiter 分隔符
     * @returns {Array} 字段数组
     */
    parseCSVLine(line, delimiter) {
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // 转义的引号
                    current += '"';
                    i++; // 跳过下一个引号
                } else {
                    // 切换引号状态
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                // 字段分隔符
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        // 添加最后一个字段
        fields.push(current.trim());
        return fields;
    }

    /**
     * 检测CSV是否有标题行
     * @param {Array} rows 数据行数组
     * @returns {boolean} 是否有标题
     */
    detectCSVHeader(rows) {
        if (rows.length < 2) return false;

        const firstRow = rows[0];
        const secondRow = rows[1];

        // 简单的启发式检测：如果第一行都是文本，第二行有数字，可能有标题
        const firstRowAllText = firstRow.every(field => isNaN(parseFloat(field)) || field.trim() === '');
        const secondRowHasNumbers = secondRow.some(field => !isNaN(parseFloat(field)) && field.trim() !== '');

        return firstRowAllText && secondRowHasNumbers;
    }

    /**
     * 处理Markdown文件
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 内容和元数据
     */
    async processMarkdownFile(filePath) {
        const markdownContent = await fs.readFile(filePath, 'utf-8');
        
        // 解析Markdown为HTML，然后提取纯文本
        const htmlContent = this.marked(markdownContent);
        const textContent = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
        
        // 提取标题
        const headers = [];
        const headerRegex = /^(#{1,6})\s+(.+)$/gm;
        let match;
        while ((match = headerRegex.exec(markdownContent)) !== null) {
            headers.push({
                level: match[1].length,
                text: match[2].trim()
            });
        }

        const metadata = {
            headerCount: headers.length,
            headers,
            hasCodeBlocks: markdownContent.includes('```'),
            hasLinks: markdownContent.includes('['),
            hasImages: markdownContent.includes('![')
        };

        return { 
            content: textContent, 
            metadata,
            originalMarkdown: markdownContent
        };
    }

    /**
     * 处理Word文档
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 内容和元数据
     */
    async processWordFile(filePath) {
        const result = await this.mammoth.extractRawText({ path: filePath });
        const content = result.value;

        const metadata = {
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
            charCount: content.length,
            paragraphCount: content.split('\n\n').length,
            hasWarnings: result.messages.length > 0,
            warnings: result.messages
        };

        return { content, metadata };
    }

    /**
     * 动态加载yauzl库
     */
    async loadYauzl() {
        if (!this.yauzl) {
            this.yauzl = require('yauzl');
        }
    }

    /**
     * 处理PowerPoint文档
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 内容和元数据
     */
    async processPowerPointFile(filePath) {
        await this.loadYauzl();

        return new Promise((resolve, reject) => {
            this.yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(new Error(`无法打开PowerPoint文件: ${err.message}`));
                    return;
                }

                let slideTexts = [];
                let slideCount = 0;
                let processedEntries = 0;
                let totalEntries = 0;

                // 计算总条目数
                zipfile.on('entry', () => totalEntries++);

                zipfile.readEntry();

                zipfile.on('entry', (entry) => {
                    // 处理幻灯片内容文件
                    if (entry.fileName.match(/ppt\/slides\/slide\d+\.xml$/)) {
                        slideCount++;

                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) {
                                processedEntries++;
                                zipfile.readEntry();
                                return;
                            }

                            let xmlData = '';
                            readStream.on('data', (chunk) => {
                                xmlData += chunk;
                            });

                            readStream.on('end', () => {
                                // 提取文本内容（简单的XML解析）
                                const textMatches = xmlData.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
                                if (textMatches) {
                                    const slideText = textMatches
                                        .map(match => match.replace(/<[^>]*>/g, ''))
                                        .join(' ')
                                        .trim();

                                    if (slideText) {
                                        slideTexts.push(slideText);
                                    }
                                }

                                processedEntries++;
                                if (processedEntries >= totalEntries) {
                                    // 所有条目处理完成
                                    const content = slideTexts.join('\n\n');
                                    const metadata = {
                                        slideCount,
                                        extractedSlides: slideTexts.length,
                                        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
                                        charCount: content.length,
                                        extractionMethod: 'XML_PARSING'
                                    };

                                    resolve({ content, metadata });
                                } else {
                                    zipfile.readEntry();
                                }
                            });
                        });
                    } else {
                        processedEntries++;
                        if (processedEntries >= totalEntries) {
                            // 所有条目处理完成
                            const content = slideTexts.join('\n\n');
                            const metadata = {
                                slideCount,
                                extractedSlides: slideTexts.length,
                                wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
                                charCount: content.length,
                                extractionMethod: 'XML_PARSING'
                            };

                            resolve({ content, metadata });
                        } else {
                            zipfile.readEntry();
                        }
                    }
                });

                zipfile.on('end', () => {
                    if (slideTexts.length === 0) {
                        resolve({
                            content: '',
                            metadata: {
                                slideCount: 0,
                                extractedSlides: 0,
                                wordCount: 0,
                                charCount: 0,
                                extractionMethod: 'XML_PARSING',
                                error: '未能提取到文本内容'
                            }
                        });
                    }
                });
            });
        });
    }

    /**
     * 生成内容摘要
     * @param {string} content 文档内容
     * @returns {string} 内容摘要
     */
    generateContentSummary(content) {
        if (!content || content.length === 0) {
            return '空文档';
        }

        // 提取前100个字符作为摘要
        const summary = content.substring(0, 100).replace(/\s+/g, ' ').trim();
        
        // 提取关键词（简单实现）
        const words = content.toLowerCase()
            .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
        
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        const keywords = Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);

        return {
            preview: summary + (content.length > 100 ? '...' : ''),
            keywords,
            length: content.length
        };
    }

    /**
     * 批量处理文档
     * @param {Array<string>} filePaths 文件路径数组
     * @param {Function} progressCallback 进度回调函数
     * @returns {Promise<Array>} 处理结果数组
     */
    async batchProcess(filePaths, progressCallback = null) {
        const results = [];
        const total = filePaths.length;
        
        for (let i = 0; i < total; i++) {
            const filePath = filePaths[i];
            const result = await this.processDocument(filePath);
            results.push(result);
            
            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total,
                    percentage: Math.round(((i + 1) / total) * 100),
                    currentFile: path.basename(filePath),
                    result
                });
            }
        }
        
        return results;
    }

    /**
     * 处理图片文件（OCR识别）
     * @param {string} filePath 图片文件路径
     * @returns {Promise<Object>} 提取的文本内容
     */
    async processImageFile(filePath) {
        try {
            console.log(`开始OCR识别图片: ${path.basename(filePath)}`);

            // 使用OCR服务识别图片中的文字
            const ocrResult = await this.ocrService.recognizeText(filePath);

            if (ocrResult.success && ocrResult.hasText) {
                console.log(`✅ OCR识别成功: ${ocrResult.wordCount} 个词`);
                return {
                    content: ocrResult.text,
                    metadata: {
                        ocrConfidence: ocrResult.confidence,
                        wordCount: ocrResult.wordCount,
                        processingTime: ocrResult.processingTime,
                        imageSize: ocrResult.metadata.imageSize,
                        languages: ocrResult.metadata.languages,
                        extractionMethod: 'OCR'
                    }
                };
            } else {
                console.log(`⚠️ OCR未识别到文字: ${path.basename(filePath)}`);
                return {
                    content: '',
                    metadata: {
                        ocrConfidence: 0,
                        wordCount: 0,
                        processingTime: ocrResult.processingTime,
                        imageSize: ocrResult.metadata?.imageSize || {},
                        extractionMethod: 'OCR',
                        error: ocrResult.error || '未识别到文字内容'
                    }
                };
            }
        } catch (error) {
            console.error(`❌ 图片OCR处理失败: ${path.basename(filePath)}`, error);
            return {
                content: '',
                metadata: {
                    error: error.message,
                    extractionMethod: 'OCR',
                    ocrConfidence: 0,
                    wordCount: 0
                }
            };
        }
    }

    /**
     * 批量处理图片文件
     * @param {Array<string>} imagePaths 图片文件路径数组
     * @param {Function} progressCallback 进度回调函数
     * @returns {Promise<Array<Object>>} 处理结果数组
     */
    async processImagesBatch(imagePaths, progressCallback = null) {
        console.log(`开始批量处理图片: ${imagePaths.length} 个文件`);

        const results = [];
        for (let i = 0; i < imagePaths.length; i++) {
            const imagePath = imagePaths[i];

            try {
                const result = await this.processImageFile(imagePath);
                results.push({
                    success: true,
                    filePath: imagePath,
                    fileName: path.basename(imagePath),
                    ...result
                });
            } catch (error) {
                results.push({
                    success: false,
                    filePath: imagePath,
                    fileName: path.basename(imagePath),
                    content: '',
                    metadata: { error: error.message },
                    error: error.message
                });
            }

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: imagePaths.length,
                    percentage: Math.round(((i + 1) / imagePaths.length) * 100),
                    currentFile: path.basename(imagePath)
                });
            }
        }

        const successCount = results.filter(r => r.success && r.content.trim().length > 0).length;
        console.log(`✅ 批量图片处理完成: ${successCount}/${imagePaths.length} 成功识别到文字`);

        return results;
    }

    /**
     * 处理PDF文件
     * @param {string} filePath PDF文件路径
     * @returns {Promise<Object>} 提取的内容信息
     */
    async processPdfFile(filePath) {
        try {
            console.log(`开始处理PDF文件: ${path.basename(filePath)}`);

            // 使用PDF服务处理文档
            const pdfResult = await this.pdfService.processPdf(filePath, {
                forceOCR: false, // 优先使用直接文本提取
                maxPages: 20,    // 限制最大页数
                density: 150,    // 图片转换密度
                ocrOptions: {
                    langs: ['chi_sim', 'eng']
                }
            });

            if (pdfResult.success) {
                console.log(`✅ PDF处理成功: ${pdfResult.metadata.totalCharacters} 字符`);
                return {
                    content: pdfResult.combinedContent,
                    metadata: {
                        pageCount: pdfResult.pageCount,
                        hasDirectText: pdfResult.metadata.hasText,
                        hasOCRText: pdfResult.metadata.hasImages,
                        extractionMethods: pdfResult.metadata.extractionMethods,
                        totalCharacters: pdfResult.metadata.totalCharacters,
                        wordCount: pdfResult.metadata.wordCount,
                        processingTime: pdfResult.processingTime,
                        extractionMethod: 'PDF处理'
                    }
                };
            } else {
                console.log(`⚠️ PDF处理失败: ${path.basename(filePath)}`);
                return {
                    content: '',
                    metadata: {
                        pageCount: 0,
                        hasDirectText: false,
                        hasOCRText: false,
                        extractionMethods: [],
                        totalCharacters: 0,
                        wordCount: 0,
                        processingTime: pdfResult.processingTime,
                        extractionMethod: 'PDF处理',
                        error: pdfResult.error || 'PDF处理失败'
                    }
                };
            }
        } catch (error) {
            console.error(`❌ PDF文件处理失败: ${path.basename(filePath)}`, error);
            return {
                content: '',
                metadata: {
                    error: error.message,
                    extractionMethod: 'PDF处理',
                    pageCount: 0,
                    hasDirectText: false,
                    hasOCRText: false,
                    totalCharacters: 0,
                    wordCount: 0
                }
            };
        }
    }

    /**
     * 批量处理PDF文件
     * @param {Array<string>} pdfPaths PDF文件路径数组
     * @param {Function} progressCallback 进度回调函数
     * @returns {Promise<Array<Object>>} 处理结果数组
     */
    async processPdfsBatch(pdfPaths, progressCallback = null) {
        console.log(`开始批量处理PDF: ${pdfPaths.length} 个文件`);

        const results = [];
        for (let i = 0; i < pdfPaths.length; i++) {
            const pdfPath = pdfPaths[i];

            try {
                const result = await this.processPdfFile(pdfPath);
                results.push({
                    success: true,
                    filePath: pdfPath,
                    fileName: path.basename(pdfPath),
                    ...result
                });
            } catch (error) {
                results.push({
                    success: false,
                    filePath: pdfPath,
                    fileName: path.basename(pdfPath),
                    content: '',
                    metadata: { error: error.message },
                    error: error.message
                });
            }

            if (progressCallback) {
                progressCallback({
                    current: i + 1,
                    total: pdfPaths.length,
                    percentage: Math.round(((i + 1) / pdfPaths.length) * 100),
                    currentFile: path.basename(pdfPath)
                });
            }
        }

        const successCount = results.filter(r => r.success && r.content.trim().length > 0).length;
        console.log(`✅ 批量PDF处理完成: ${successCount}/${pdfPaths.length} 成功提取内容`);

        return results;
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            await this.ocrService.cleanup();
            await this.pdfService.cleanup();
            console.log('📄 DocumentProcessor 资源已清理');
        } catch (error) {
            console.error('清理DocumentProcessor资源失败:', error);
        }
    }

    /**
     * 获取OCR服务状态
     * @returns {Object} OCR服务状态
     */
    getOCRStatus() {
        return this.ocrService.getStatus();
    }

    /**
     * 处理通用文件（音频、视频、压缩包等）
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 提取的内容信息
     */
    async processGenericFile(filePath) {
        try {
            console.log(`开始处理通用文件: ${path.basename(filePath)}`);

            // 使用通用文件服务处理
            const genericResult = await this.genericFileService.processFile(filePath);

            if (genericResult.success) {
                console.log(`✅ 通用文件处理成功: ${genericResult.contentLength} 字符`);
                return {
                    content: genericResult.content,
                    metadata: {
                        ...genericResult.metadata,
                        extractionMethod: '通用文件处理'
                    }
                };
            } else {
                console.log(`⚠️ 通用文件处理失败: ${path.basename(filePath)}`);
                return {
                    content: '',
                    metadata: {
                        extractionMethod: '通用文件处理',
                        error: genericResult.error || '通用文件处理失败'
                    }
                };
            }
        } catch (error) {
            console.error(`❌ 通用文件处理失败: ${path.basename(filePath)}`, error);
            return {
                content: '',
                metadata: {
                    error: error.message,
                    extractionMethod: '通用文件处理'
                }
            };
        }
    }

    /**
     * 获取PDF服务状态
     * @returns {Object} PDF服务状态
     */
    getPDFStatus() {
        return this.pdfService.getStatus();
    }

    /**
     * 获取通用文件服务状态
     * @returns {Object} 通用文件服务状态
     */
    getGenericFileStatus() {
        return this.genericFileService.getStatus();
    }

    /**
     * 处理文件的统一入口方法
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 处理结果
     */
    async processFile(filePath) {
        try {
            const result = await this.processDocument(filePath);
            return {
                success: true,
                content: result.content || '',
                metadata: result.metadata || {},
                filePath: filePath
            };
        } catch (error) {
            console.error(`❌ 文件处理失败: ${path.basename(filePath)}`, error);
            return {
                success: false,
                content: '',
                metadata: { error: error.message },
                filePath: filePath
            };
        }
    }
}

module.exports = DocumentProcessor;
