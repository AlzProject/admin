import fs from 'fs';
import path from 'path';

// Usage: node scripts/createTest.js <path-to-data.json>

const API_URL = process.env.API_URL || 'http://localhost:3000/v1';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD || '123456';
const dataPath = process.argv[2];

if (!dataPath) {
  console.error('Usage: node scripts/createTest.js <path-to-data.json>');
  process.exit(1);
}

const fullPath = path.resolve(dataPath);
if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

async function rq(method, endpoint, payload, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch(e) { json = { error: text }; }
  
  if (!res.ok) {
    throw new Error(`API ${method} ${endpoint} failed: ${res.status} ${text}`);
  }
  return json;
}

async function run() {
  try {
    console.log(`Authenticating as ${adminEmail}...`);
    const authRes = await rq('POST', '/auth/login', { email: adminEmail, password: adminPassword });
    const token = authRes.access_token;

    for (const testData of Array.isArray(data) ? data : [data]) {
      console.log(`Creating test: ${testData.title}`);
      const tRes = await rq('POST', '/tests', {
        title: testData.title,
        description: testData.description || '',
        test_specific_info: testData.test_specific_info || { language: testData.language || 'en' },
        isActive: true,
        duration: testData.duration || undefined
      }, token);
      const testId = tRes.id;
      console.log(`  Test ID: ${testId}`);

      for (const sectionData of testData.sections || []) {
        console.log(`  Creating section: ${sectionData.title}`);
        const sRes = await rq('POST', `/tests/${testId}/sections`, {
          title: sectionData.title,
          description: sectionData.description || '',
          orderIndex: sectionData.orderIndex || 1,
          config: sectionData.config || {}
        }, token);
        const sectionId = sRes.id;
        
        async function createQ(qData, parentId = null) {
          const qText = qData.text || '';
          console.log(`    Creating question: ${qText.substring(0, 30)}...`);
          const qRes = await rq('POST', `/sections/${sectionId}/questions`, {
            text: qText,
            type: qData.type || 'text',
            maxScore: qData.maxScore !== undefined ? qData.maxScore : 1,
            negativeScore: qData.negativeScore || 0,
            partialMarking: qData.partialMarking || false,
            config: qData.config || {},
            isGradable: typeof qData.isGradable === 'boolean' ? qData.isGradable : true,
            ans: qData.ans || '',
            parentId: parentId
          }, token);
          const qId = qRes.id;

          if (qData.options && Array.isArray(qData.options)) {
            for (const opt of qData.options) {
               await rq('POST', `/questions/${qId}/options`, {
                 text: opt.text || '',
                 isCorrect: opt.isCorrect || false,
                 weight: opt.weight || (opt.isCorrect ? 1 : 0)
               }, token);
            }
          }

          if (qData.subQuestions && Array.isArray(qData.subQuestions)) {
            for (const subq of qData.subQuestions) {
              await createQ(subq, qId);
            }
          }
        }
        
        for (const [index, qData] of (sectionData.questions || []).entries()) {
          qData.config = qData.config || {};
          qData.config.displayOrder = qData.config.displayOrder !== undefined ? qData.config.displayOrder : index;
          await createQ(qData);
        }
      }
    }
    console.log('All test uploads completed successfully!');
  } catch (error) {
    console.error(error);
  }
}

run();
