const fs = require('fs').promises;
const path = require('path');
const yauzl = require('yauzl');
const { promisify } = require('util');

/**
 * 通用文件处理服务 - 第五阶段：其他文件类型支持
 * 支持音频、视频、压缩文件等其他文件类型的元数据提取和智能重命名
 */
class GenericFileService {
    constructor() {
        this.supportedTypes = {
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
        this.musicMetadata = null;
    }

    /**
     * 动态加载音频元数据库
     */
    async loadMusicMetadata() {
        if (!this.musicMetadata) {
            try {
                this.musicMetadata = await import('music-metadata');
            } catch (error) {
                console.warn('音频元数据库加载失败:', error.message);
                this.musicMetadata = null;
            }
        }
    }

    /**
     * 检查文件类型
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
     * 检查文件是否支持处理
     * @param {string} filePath 文件路径
     * @returns {boolean} 是否支持
     */
    isSupported(filePath) {
        return this.getFileType(filePath) !== 'unknown';
    }

    /**
     * 处理通用文件
     * @param {string} filePath 文件路径
     * @param {Object} options 处理选项
     * @returns {Promise<Object>} 处理结果
     */
    async processFile(filePath, options = {}) {
        try {
            console.log(`🔍 开始处理通用文件: ${path.basename(filePath)}`);

            // 检查文件是否存在
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
            if (!fileExists) {
                throw new Error(`文件不存在: ${filePath}`);
            }

            const fileType = this.getFileType(filePath);
            const fileName = path.basename(filePath);
            const startTime = Date.now();

            let content = '';
            let metadata = {
                fileType,
                fileName,
                filePath,
                processedAt: new Date().toISOString()
            };

            // 根据文件类型选择处理方法
            switch (fileType) {
                case 'audio':
                    ({ content, metadata } = await this.processAudioFile(filePath, metadata));
                    break;
                case 'video':
                    ({ content, metadata } = await this.processVideoFile(filePath, metadata));
                    break;
                case 'archive':
                    ({ content, metadata } = await this.processArchiveFile(filePath, metadata));
                    break;
                case 'code':
                    ({ content, metadata } = await this.processCodeFile(filePath, metadata));
                    break;
                default:
                    ({ content, metadata } = await this.processGenericFile(filePath, metadata));
                    break;
            }

            const processingTime = Date.now() - startTime;
            metadata.processingTime = processingTime;

            console.log(`✅ 通用文件处理完成: ${fileName} (${fileType})`);
            console.log(`   - 内容长度: ${content.length} 字符`);
            console.log(`   - 处理时间: ${processingTime}ms`);

            return {
                success: true,
                fileName,
                fileType,
                content: content.trim(),
                metadata,
                extractedAt: new Date().toISOString(),
                contentLength: content.length,
                summary: this.generateContentSummary(content, fileType)
            };

        } catch (error) {
            console.error(`❌ 通用文件处理失败: ${path.basename(filePath)}`, error);
            return {
                success: false,
                fileName: path.basename(filePath),
                fileType: this.getFileType(filePath),
                content: '',
                metadata: {
                    error: error.message,
                    processedAt: new Date().toISOString()
                },
                error: error.message
            };
        }
    }

    /**
     * 处理音频文件
     * @param {string} filePath 音频文件路径
     * @param {Object} metadata 元数据对象
     * @returns {Promise<Object>} 处理结果
     */
    async processAudioFile(filePath, metadata) {
        try {
            await this.loadMusicMetadata();
            
            if (!this.musicMetadata) {
                throw new Error('音频元数据库未加载');
            }

            console.log('🎵 提取音频元数据...');
            const audioMetadata = await this.musicMetadata.parseFile(filePath);

            const content = this.buildAudioContent(audioMetadata);
            
            metadata.audioInfo = {
                title: audioMetadata.common.title || '',
                artist: audioMetadata.common.artist || '',
                album: audioMetadata.common.album || '',
                year: audioMetadata.common.year || '',
                genre: audioMetadata.common.genre ? audioMetadata.common.genre.join(', ') : '',
                duration: audioMetadata.format.duration || 0,
                bitrate: audioMetadata.format.bitrate || 0,
                sampleRate: audioMetadata.format.sampleRate || 0,
                codec: audioMetadata.format.codec || '',
                extractionMethod: '音频元数据'
            };

            return { content, metadata };

        } catch (error) {
            console.warn('音频元数据提取失败:', error.message);
            return {
                content: `音频文件: ${path.basename(filePath)}`,
                metadata: {
                    ...metadata,
                    audioInfo: {
                        extractionMethod: '基础信息',
                        error: error.message
                    }
                }
            };
        }
    }

    /**
     * 构建音频内容描述
     * @param {Object} audioMetadata 音频元数据
     * @returns {string} 内容描述
     */
    buildAudioContent(audioMetadata) {
        const parts = [];
        
        if (audioMetadata.common.title) {
            parts.push(`标题: ${audioMetadata.common.title}`);
        }
        
        if (audioMetadata.common.artist) {
            parts.push(`艺术家: ${audioMetadata.common.artist}`);
        }
        
        if (audioMetadata.common.album) {
            parts.push(`专辑: ${audioMetadata.common.album}`);
        }
        
        if (audioMetadata.common.year) {
            parts.push(`年份: ${audioMetadata.common.year}`);
        }
        
        if (audioMetadata.common.genre && audioMetadata.common.genre.length > 0) {
            parts.push(`类型: ${audioMetadata.common.genre.join(', ')}`);
        }
        
        if (audioMetadata.format.duration) {
            const duration = Math.round(audioMetadata.format.duration);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            parts.push(`时长: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        }

        return parts.length > 0 ? parts.join('\n') : '音频文件';
    }

    /**
     * 处理视频文件
     * @param {string} filePath 视频文件路径
     * @param {Object} metadata 元数据对象
     * @returns {Promise<Object>} 处理结果
     */
    async processVideoFile(filePath, metadata) {
        try {
            console.log('🎬 处理视频文件...');
            
            // 获取文件基本信息
            const stats = await fs.stat(filePath);
            const fileName = path.basename(filePath, path.extname(filePath));
            
            // 尝试从文件名提取信息
            const videoInfo = this.extractVideoInfoFromName(fileName);
            
            const content = this.buildVideoContent(fileName, videoInfo, stats);
            
            metadata.videoInfo = {
                ...videoInfo,
                fileSize: stats.size,
                fileSizeFormatted: this.formatFileSize(stats.size),
                extractionMethod: '文件名分析'
            };

            return { content, metadata };

        } catch (error) {
            console.warn('视频文件处理失败:', error.message);
            return {
                content: `视频文件: ${path.basename(filePath)}`,
                metadata: {
                    ...metadata,
                    videoInfo: {
                        extractionMethod: '基础信息',
                        error: error.message
                    }
                }
            };
        }
    }

    /**
     * 从文件名提取视频信息
     * @param {string} fileName 文件名
     * @returns {Object} 视频信息
     */
    extractVideoInfoFromName(fileName) {
        const info = {
            title: fileName,
            resolution: '',
            quality: '',
            year: '',
            episode: ''
        };

        // 提取分辨率
        const resolutionMatch = fileName.match(/(\d{3,4}[px]|\d{3,4}x\d{3,4}|4K|8K|HD|FHD|UHD)/i);
        if (resolutionMatch) {
            info.resolution = resolutionMatch[1];
        }

        // 提取年份
        const yearMatch = fileName.match(/(19|20)\d{2}/);
        if (yearMatch) {
            info.year = yearMatch[0];
        }

        // 提取集数
        const episodeMatch = fileName.match(/[SE]\d{1,3}|第\d+集|EP?\d+/i);
        if (episodeMatch) {
            info.episode = episodeMatch[0];
        }

        // 提取质量标识
        const qualityMatch = fileName.match(/(BluRay|BDRip|DVDRip|WEBRip|HDTV|WEB-DL)/i);
        if (qualityMatch) {
            info.quality = qualityMatch[1];
        }

        return info;
    }

    /**
     * 构建视频内容描述
     * @param {string} fileName 文件名
     * @param {Object} videoInfo 视频信息
     * @param {Object} stats 文件统计信息
     * @returns {string} 内容描述
     */
    buildVideoContent(fileName, videoInfo, stats) {
        const parts = [`视频标题: ${videoInfo.title}`];
        
        if (videoInfo.year) {
            parts.push(`年份: ${videoInfo.year}`);
        }
        
        if (videoInfo.resolution) {
            parts.push(`分辨率: ${videoInfo.resolution}`);
        }
        
        if (videoInfo.quality) {
            parts.push(`质量: ${videoInfo.quality}`);
        }
        
        if (videoInfo.episode) {
            parts.push(`集数: ${videoInfo.episode}`);
        }
        
        parts.push(`文件大小: ${this.formatFileSize(stats.size)}`);

        return parts.join('\n');
    }

    /**
     * 处理压缩文件
     * @param {string} filePath 压缩文件路径
     * @param {Object} metadata 元数据对象
     * @returns {Promise<Object>} 处理结果
     */
    async processArchiveFile(filePath, metadata) {
        try {
            console.log('📦 处理压缩文件...');
            
            const ext = path.extname(filePath).toLowerCase();
            
            if (ext === '.zip') {
                return await this.processZipFile(filePath, metadata);
            } else {
                // 其他压缩格式暂时只提供基本信息
                const stats = await fs.stat(filePath);
                const content = `压缩文件: ${path.basename(filePath)}\n文件大小: ${this.formatFileSize(stats.size)}`;
                
                metadata.archiveInfo = {
                    type: ext.substring(1),
                    fileSize: stats.size,
                    fileSizeFormatted: this.formatFileSize(stats.size),
                    extractionMethod: '基础信息'
                };

                return { content, metadata };
            }

        } catch (error) {
            console.warn('压缩文件处理失败:', error.message);
            return {
                content: `压缩文件: ${path.basename(filePath)}`,
                metadata: {
                    ...metadata,
                    archiveInfo: {
                        extractionMethod: '基础信息',
                        error: error.message
                    }
                }
            };
        }
    }

    /**
     * 处理ZIP文件
     * @param {string} filePath ZIP文件路径
     * @param {Object} metadata 元数据对象
     * @returns {Promise<Object>} 处理结果
     */
    async processZipFile(filePath, metadata) {
        return new Promise((resolve) => {
            yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    console.warn('ZIP文件打开失败:', err.message);
                    resolve({
                        content: `ZIP文件: ${path.basename(filePath)}`,
                        metadata: {
                            ...metadata,
                            archiveInfo: {
                                extractionMethod: '基础信息',
                                error: err.message
                            }
                        }
                    });
                    return;
                }

                const entries = [];
                let totalSize = 0;

                zipfile.readEntry();
                
                zipfile.on('entry', (entry) => {
                    entries.push({
                        fileName: entry.fileName,
                        uncompressedSize: entry.uncompressedSize,
                        isDirectory: entry.fileName.endsWith('/')
                    });
                    
                    totalSize += entry.uncompressedSize;
                    zipfile.readEntry();
                });

                zipfile.on('end', () => {
                    const content = this.buildZipContent(entries, totalSize);
                    
                    metadata.archiveInfo = {
                        type: 'zip',
                        entryCount: entries.length,
                        totalUncompressedSize: totalSize,
                        totalUncompressedSizeFormatted: this.formatFileSize(totalSize),
                        extractionMethod: 'ZIP内容列表'
                    };

                    resolve({ content, metadata });
                });

                zipfile.on('error', (error) => {
                    console.warn('ZIP文件读取失败:', error.message);
                    resolve({
                        content: `ZIP文件: ${path.basename(filePath)}`,
                        metadata: {
                            ...metadata,
                            archiveInfo: {
                                extractionMethod: '基础信息',
                                error: error.message
                            }
                        }
                    });
                });
            });
        });
    }

    /**
     * 构建ZIP内容描述
     * @param {Array} entries 文件条目
     * @param {number} totalSize 总大小
     * @returns {string} 内容描述
     */
    buildZipContent(entries, totalSize) {
        const files = entries.filter(e => !e.isDirectory);
        const dirs = entries.filter(e => e.isDirectory);
        
        const parts = [
            `ZIP压缩包内容:`,
            `文件数量: ${files.length}`,
            `文件夹数量: ${dirs.length}`,
            `解压后大小: ${this.formatFileSize(totalSize)}`
        ];

        // 显示前几个文件
        if (files.length > 0) {
            parts.push('\n主要文件:');
            files.slice(0, 5).forEach(file => {
                parts.push(`- ${file.fileName} (${this.formatFileSize(file.uncompressedSize)})`);
            });
            
            if (files.length > 5) {
                parts.push(`... 还有 ${files.length - 5} 个文件`);
            }
        }

        return parts.join('\n');
    }

    /**
     * 处理代码文件
     * @param {string} filePath 代码文件路径
     * @param {Object} metadata 元数据对象
     * @returns {Promise<Object>} 处理结果
     */
    async processCodeFile(filePath, metadata) {
        try {
            console.log('💻 处理代码文件...');
            
            // 读取文件内容（限制大小）
            const stats = await fs.stat(filePath);
            const maxSize = 50 * 1024; // 50KB限制
            
            let content = '';
            if (stats.size <= maxSize) {
                const fileContent = await fs.readFile(filePath, 'utf8');
                content = this.buildCodeContent(fileContent, filePath);
            } else {
                content = `代码文件: ${path.basename(filePath)}\n文件过大，无法读取内容`;
            }
            
            metadata.codeInfo = {
                language: this.detectLanguage(filePath),
                fileSize: stats.size,
                fileSizeFormatted: this.formatFileSize(stats.size),
                extractionMethod: '代码分析'
            };

            return { content, metadata };

        } catch (error) {
            console.warn('代码文件处理失败:', error.message);
            return {
                content: `代码文件: ${path.basename(filePath)}`,
                metadata: {
                    ...metadata,
                    codeInfo: {
                        extractionMethod: '基础信息',
                        error: error.message
                    }
                }
            };
        }
    }

    /**
     * 构建代码内容描述
     * @param {string} fileContent 文件内容
     * @param {string} filePath 文件路径
     * @returns {string} 内容描述
     */
    buildCodeContent(fileContent, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const lines = fileContent.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);

        // 特殊处理JSON文件
        if (ext === '.json') {
            return this.buildJsonContent(fileContent, filePath);
        }

        // 特殊处理Python文件
        if (ext === '.py') {
            return this.buildPythonContent(fileContent, filePath);
        }

        const parts = [
            `代码文件: ${path.basename(filePath)}`,
            `编程语言: ${this.detectLanguage(filePath)}`,
            `总行数: ${lines.length}`,
            `有效行数: ${nonEmptyLines.length}`
        ];

        // 尝试提取注释和函数名
        const comments = this.extractComments(fileContent, filePath);
        const functions = this.extractFunctions(fileContent, filePath);

        if (comments.length > 0) {
            parts.push(`\n主要注释:`);
            comments.slice(0, 3).forEach(comment => {
                parts.push(`- ${comment}`);
            });
        }

        if (functions.length > 0) {
            parts.push(`\n主要函数:`);
            functions.slice(0, 5).forEach(func => {
                parts.push(`- ${func}`);
            });
        }

        return parts.join('\n');
    }

    /**
     * 构建JSON文件内容描述
     * @param {string} fileContent JSON文件内容
     * @param {string} filePath 文件路径
     * @returns {string} 内容描述
     */
    buildJsonContent(fileContent, filePath) {
        const parts = [
            `JSON文件: ${path.basename(filePath)}`,
            `文件大小: ${fileContent.length} 字符`
        ];

        try {
            const jsonData = JSON.parse(fileContent);
            const keys = Object.keys(jsonData);

            parts.push(`主要字段数量: ${keys.length}`);

            if (keys.length > 0) {
                parts.push(`\n主要字段:`);
                keys.slice(0, 10).forEach(key => {
                    const value = jsonData[key];
                    const type = Array.isArray(value) ? 'array' : typeof value;
                    parts.push(`- ${key}: ${type}`);
                });
            }

            // 检测常见的JSON结构类型
            const structureType = this.detectJsonStructure(jsonData);
            if (structureType) {
                parts.push(`\n结构类型: ${structureType}`);
            }

        } catch (error) {
            parts.push(`JSON解析失败: ${error.message}`);
            // 提取部分文本内容作为备选
            const preview = fileContent.substring(0, 200).replace(/\s+/g, ' ');
            parts.push(`内容预览: ${preview}...`);
        }

        return parts.join('\n');
    }

    /**
     * 构建Python文件内容描述
     * @param {string} fileContent Python文件内容
     * @param {string} filePath 文件路径
     * @returns {string} 内容描述
     */
    buildPythonContent(fileContent, filePath) {
        const lines = fileContent.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);

        const parts = [
            `Python文件: ${path.basename(filePath)}`,
            `总行数: ${lines.length}`,
            `有效行数: ${nonEmptyLines.length}`
        ];

        // 提取Python特有的信息
        const imports = this.extractPythonImports(fileContent);
        const functions = this.extractPythonFunctions(fileContent);
        const classes = this.extractPythonClasses(fileContent);
        const docstrings = this.extractPythonDocstrings(fileContent);

        if (imports.length > 0) {
            parts.push(`\n导入模块:`);
            imports.slice(0, 5).forEach(imp => {
                parts.push(`- ${imp}`);
            });
        }

        if (classes.length > 0) {
            parts.push(`\n类定义:`);
            classes.slice(0, 3).forEach(cls => {
                parts.push(`- ${cls}`);
            });
        }

        if (functions.length > 0) {
            parts.push(`\n函数定义:`);
            functions.slice(0, 5).forEach(func => {
                parts.push(`- ${func}`);
            });
        }

        if (docstrings.length > 0) {
            parts.push(`\n文档字符串:`);
            docstrings.slice(0, 2).forEach(doc => {
                parts.push(`- ${doc}`);
            });
        }

        return parts.join('\n');
    }

    /**
     * 检测编程语言
     * @param {string} filePath 文件路径
     * @returns {string} 编程语言
     */
    detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap = {
            '.js': 'JavaScript',
            '.ts': 'TypeScript',
            '.jsx': 'React JSX',
            '.vue': 'Vue.js',
            '.py': 'Python',
            '.java': 'Java',
            '.cpp': 'C++',
            '.c': 'C',
            '.h': 'C Header',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.go': 'Go',
            '.rs': 'Rust',
            '.swift': 'Swift',
            '.kt': 'Kotlin',
            '.html': 'HTML',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.sass': 'Sass',
            '.less': 'Less',
            '.json': 'JSON',
            '.xml': 'XML',
            '.yaml': 'YAML',
            '.yml': 'YAML',
            '.sql': 'SQL',
            '.sh': 'Shell Script',
            '.bash': 'Bash Script',
            '.ps1': 'PowerShell'
        };
        
        return languageMap[ext] || '未知语言';
    }

    /**
     * 提取注释
     * @param {string} content 文件内容
     * @param {string} filePath 文件路径
     * @returns {Array<string>} 注释数组
     */
    extractComments(content, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const comments = [];

        if (['.js', '.ts', '.jsx', '.java', '.cpp', '.c', '.php', '.go', '.rs', '.swift', '.kt'].includes(ext)) {
            // 单行注释 //
            const singleLineComments = content.match(/\/\/\s*(.+)/g);
            if (singleLineComments) {
                comments.push(...singleLineComments.map(c => c.replace(/\/\/\s*/, '').trim()));
            }
            
            // 多行注释 /* */
            const multiLineComments = content.match(/\/\*[\s\S]*?\*\//g);
            if (multiLineComments) {
                comments.push(...multiLineComments.map(c => 
                    c.replace(/\/\*|\*\//g, '').trim().split('\n')[0].trim()
                ));
            }
        } else if (['.py', '.sh', '.bash'].includes(ext)) {
            // Python/Shell 注释 #
            const pythonComments = content.match(/#\s*(.+)/g);
            if (pythonComments) {
                comments.push(...pythonComments.map(c => c.replace(/#\s*/, '').trim()));
            }
        }

        return comments.filter(c => c.length > 5).slice(0, 5);
    }

    /**
     * 提取函数名
     * @param {string} content 文件内容
     * @param {string} filePath 文件路径
     * @returns {Array<string>} 函数名数组
     */
    extractFunctions(content, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const functions = [];

        if (['.js', '.ts', '.jsx'].includes(ext)) {
            // JavaScript/TypeScript 函数
            const jsFunctions = content.match(/function\s+(\w+)|(\w+)\s*[:=]\s*function|(\w+)\s*\([^)]*\)\s*=>/g);
            if (jsFunctions) {
                functions.push(...jsFunctions);
            }
        } else if (ext === '.py') {
            // Python 函数
            const pyFunctions = content.match(/def\s+(\w+)\s*\(/g);
            if (pyFunctions) {
                functions.push(...pyFunctions);
            }
        } else if (['.java', '.cpp', '.c'].includes(ext)) {
            // Java/C++ 函数
            const cFunctions = content.match(/\w+\s+(\w+)\s*\([^)]*\)\s*{/g);
            if (cFunctions) {
                functions.push(...cFunctions);
            }
        }

        return functions.slice(0, 10);
    }

    /**
     * 检测JSON结构类型
     * @param {Object} jsonData JSON数据
     * @returns {string} 结构类型
     */
    detectJsonStructure(jsonData) {
        if (Array.isArray(jsonData)) {
            return '数组结构';
        }

        const keys = Object.keys(jsonData);

        // 检测常见的配置文件结构
        if (keys.includes('name') && keys.includes('version')) {
            return '包配置文件 (package.json)';
        }

        if (keys.includes('scripts') || keys.includes('dependencies')) {
            return 'Node.js项目配置';
        }

        if (keys.includes('compilerOptions') || keys.includes('include')) {
            return 'TypeScript配置';
        }

        if (keys.includes('rules') || keys.includes('extends')) {
            return 'ESLint配置';
        }

        return '对象结构';
    }

    /**
     * 提取Python导入语句
     * @param {string} content Python文件内容
     * @returns {Array} 导入语句数组
     */
    extractPythonImports(content) {
        const imports = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
                imports.push(trimmed);
            }
        }

        return imports;
    }

    /**
     * 提取Python函数定义
     * @param {string} content Python文件内容
     * @returns {Array} 函数定义数组
     */
    extractPythonFunctions(content) {
        const functions = [];
        const functionRegex = /def\s+(\w+)\s*\([^)]*\):/g;
        let match;

        while ((match = functionRegex.exec(content)) !== null) {
            functions.push(match[1]);
        }

        return functions;
    }

    /**
     * 提取Python类定义
     * @param {string} content Python文件内容
     * @returns {Array} 类定义数组
     */
    extractPythonClasses(content) {
        const classes = [];
        const classRegex = /class\s+(\w+)(?:\([^)]*\))?:/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
            classes.push(match[1]);
        }

        return classes;
    }

    /**
     * 提取Python文档字符串
     * @param {string} content Python文件内容
     * @returns {Array} 文档字符串数组
     */
    extractPythonDocstrings(content) {
        const docstrings = [];
        const docstringRegex = /"""([\s\S]*?)"""|'''([\s\S]*?)'''/g;
        let match;

        while ((match = docstringRegex.exec(content)) !== null) {
            const docstring = (match[1] || match[2]).trim();
            if (docstring.length > 10) { // 过滤掉太短的字符串
                // 只取第一行作为摘要
                const firstLine = docstring.split('\n')[0].trim();
                docstrings.push(firstLine);
            }
        }

        return docstrings;
    }

    /**
     * 处理通用文件
     * @param {string} filePath 文件路径
     * @param {Object} metadata 元数据对象
     * @returns {Promise<Object>} 处理结果
     */
    async processGenericFile(filePath, metadata) {
        try {
            const stats = await fs.stat(filePath);
            const fileName = path.basename(filePath);
            
            const content = `文件: ${fileName}\n类型: ${metadata.fileType}\n大小: ${this.formatFileSize(stats.size)}`;
            
            metadata.genericInfo = {
                fileSize: stats.size,
                fileSizeFormatted: this.formatFileSize(stats.size),
                extractionMethod: '基础信息'
            };

            return { content, metadata };

        } catch (error) {
            return {
                content: `文件: ${path.basename(filePath)}`,
                metadata: {
                    ...metadata,
                    genericInfo: {
                        extractionMethod: '基础信息',
                        error: error.message
                    }
                }
            };
        }
    }

    /**
     * 生成内容摘要
     * @param {string} content 内容
     * @param {string} fileType 文件类型
     * @returns {string} 内容摘要
     */
    generateContentSummary(content, fileType) {
        if (!content || content.length === 0) {
            return `${fileType}文件，无内容信息`;
        }

        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const firstLine = lines[0] || '';
        
        if (firstLine.length > 50) {
            return firstLine.substring(0, 50) + '...';
        }
        
        return firstLine || `${fileType}文件`;
    }

    /**
     * 格式化文件大小
     * @param {number} bytes 字节数
     * @returns {string} 格式化后的文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 获取支持的文件类型
     * @returns {Object} 支持的文件类型映射
     */
    getSupportedTypes() {
        return { ...this.supportedTypes };
    }

    /**
     * 获取服务状态
     * @returns {Object} 服务状态信息
     */
    getStatus() {
        return {
            supportedTypes: Object.keys(this.supportedTypes),
            totalSupportedExtensions: Object.values(this.supportedTypes).flat().length,
            musicMetadataLoaded: !!this.musicMetadata
        };
    }
}

module.exports = GenericFileService;
