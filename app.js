const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// 环境变量（Render 中配置）
const ACCESS_TOKEN = process.env.TENCENT_ACCESS_TOKEN;
const CLIENT_ID = process.env.TENCENT_CLIENT_ID;
const OPEN_ID = process.env.TENCENT_OPEN_ID;
const DOC_ID = process.env.TENCENT_DOC_ID;
const SHEET_ID = process.env.TENCENT_SHEET_ID;

if (!ACCESS_TOKEN || !CLIENT_ID || !OPEN_ID || !DOC_ID || !SHEET_ID) {
    console.error('❌ 缺少环境变量，请检查 Render 配置');
    process.exit(1);
}

app.post('/api/report', async (req, res) => {
    try {
        const data = req.body;
        console.log('收到上报数据:', JSON.stringify(data, null, 2));

        if (!data.考场名称 || !data.考试科目) {
            return res.status(400).json({ code: -1, msg: '缺少考场名称或考试科目' });
        }

        // 缺考名单转字符串
        let absentStr = '';
        if (data.缺考名单 && Array.isArray(data.缺考名单)) {
            absentStr = data.缺考名单.map(s => `${s.姓名}(${s.考试号})`).join('；');
        }

        // 准备要写入的一行数据（对象格式，键名需与表格列标题一致）
        const recordValues = {
            "考场名称": data.考场名称,
            "考试科目": data.考试科目,
            "考试日期": data.考试日期 || '',
            "应到人数": data.应到人数 || '',
            "实到人数": data.实到人数 || '',
            "缺考名单": absentStr,
            "监考员甲": data.监考员甲 || '',
            "监考员乙": data.监考员乙 || '',
            "上报时间": data.上报时间 || new Date().toLocaleString('zh-CN')
        };

        // 调用腾讯文档 API 添加记录
        const apiUrl = `https://docs.qq.com/openapi/v3/smartsheet/v2/files/${DOC_ID}/sheets/${SHEET_ID}/records`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Access-Token': ACCESS_TOKEN,
                'Client-Id': CLIENT_ID,
                'Open-Id': OPEN_ID,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                records: [{ values: recordValues }]
            })
        });

        const result = await response.json();
        console.log('API 响应:', result);

        if (!response.ok) {
            throw new Error(`写入失败: ${JSON.stringify(result)}`);
        }

        res.json({ code: 0, msg: '上报成功' });
    } catch (err) {
        console.error('错误:', err);
        res.status(500).json({ code: -1, msg: err.message });
    }
});

app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ 服务运行在端口 ${PORT}`));