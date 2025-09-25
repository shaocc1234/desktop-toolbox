/**
 * 全局设置相关路由
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * 测试API Key连接
 */
router.post('/test-api-key', async (req, res) => {
    try {
        const { provider, apiKey } = req.body;
        
        if (!provider || !apiKey) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        console.log(`🔍 测试 ${provider} API Key: ${apiKey.substring(0, 10)}...`);

        let testResult;
        
        switch (provider) {
            case 'siliconflow':
                testResult = await testSiliconFlowAPI(apiKey);
                break;
            case 'doubao':
                testResult = await testDoubaoAPI(apiKey);
                break;
            case 'deepseek':
                testResult = await testDeepSeekAPI(apiKey);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: '不支持的服务商'
                });
        }

        res.json(testResult);

    } catch (error) {
        console.error('API测试失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: error.message
        });
    }
});

/**
 * 测试硅基流动API
 */
async function testSiliconFlowAPI(apiKey) {
    try {
        const response = await axios.post(
            'https://api.siliconflow.cn/v1/chat/completions',
            {
                model: 'Qwen/Qwen2.5-7B-Instruct',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, this is a connection test.'
                    }
                ],
                max_tokens: 10,
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (response.status === 200 && response.data.choices) {
            return {
                success: true,
                message: '连接成功',
                details: {
                    model: response.data.model || 'Qwen/Qwen2.5-7B-Instruct',
                    usage: response.data.usage
                }
            };
        } else {
            return {
                success: false,
                message: '连接失败：响应格式异常'
            };
        }

    } catch (error) {
        console.error('硅基流动API测试失败:', error.message);
        
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            if (status === 401) {
                return {
                    success: false,
                    message: 'API Key无效或已过期'
                };
            } else if (status === 429) {
                return {
                    success: false,
                    message: '请求频率过高，请稍后重试'
                };
            } else if (status === 403) {
                return {
                    success: false,
                    message: 'API Key权限不足'
                };
            } else {
                return {
                    success: false,
                    message: `连接失败：${data?.error?.message || '未知错误'}`
                };
            }
        } else if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                message: '连接超时，请检查网络'
            };
        } else {
            return {
                success: false,
                message: `网络错误：${error.message}`
            };
        }
    }
}

/**
 * 测试豆包API
 */
async function testDoubaoAPI(apiKey) {
    try {
        const response = await axios.post(
            'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            {
                model: 'doubao-seed-1-6-flash-250615',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, this is a connection test.'
                    }
                ],
                max_tokens: 10,
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (response.status === 200 && response.data.choices) {
            return {
                success: true,
                message: '连接成功',
                details: {
                    model: response.data.model || 'doubao-seed-1-6-flash-250615',
                    usage: response.data.usage
                }
            };
        } else {
            return {
                success: false,
                message: '连接失败：响应格式异常'
            };
        }

    } catch (error) {
        console.error('豆包API测试失败:', error.message);
        
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            if (status === 401) {
                return {
                    success: false,
                    message: 'API Key无效或已过期'
                };
            } else if (status === 429) {
                return {
                    success: false,
                    message: '请求频率过高，请稍后重试'
                };
            } else {
                return {
                    success: false,
                    message: `连接失败：${data?.error?.message || '未知错误'}`
                };
            }
        } else if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                message: '连接超时，请检查网络'
            };
        } else {
            return {
                success: false,
                message: `网络错误：${error.message}`
            };
        }
    }
}

/**
 * 测试DeepSeek API
 */
async function testDeepSeekAPI(apiKey) {
    try {
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, this is a connection test.'
                    }
                ],
                max_tokens: 10,
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        if (response.status === 200 && response.data.choices) {
            return {
                success: true,
                message: '连接成功',
                details: {
                    model: response.data.model || 'deepseek-chat',
                    usage: response.data.usage
                }
            };
        } else {
            return {
                success: false,
                message: '连接失败：响应格式异常'
            };
        }

    } catch (error) {
        console.error('DeepSeek API测试失败:', error.message);
        
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            if (status === 401) {
                return {
                    success: false,
                    message: 'API Key无效或已过期'
                };
            } else if (status === 429) {
                return {
                    success: false,
                    message: '请求频率过高，请稍后重试'
                };
            } else {
                return {
                    success: false,
                    message: `连接失败：${data?.error?.message || '未知错误'}`
                };
            }
        } else if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                message: '连接超时，请检查网络'
            };
        } else {
            return {
                success: false,
                message: `网络错误：${error.message}`
            };
        }
    }
}

module.exports = router;
