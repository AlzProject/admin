import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

// Usage: node scripts/updateTest.js <test-id> <path-to-data.json>

const API_URL = process.env.API_URL || 'https://api.alzsmriti.one/v1';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'cognitive';

const targetTestId = process.argv[2];
const dataPath = process.argv[3];

if (!targetTestId || !dataPath) {
  console.error('Usage: node scripts/updateTest.js <test-id> <path-to-data.json>');
  process.exit(1);
}

const fullPath = path.resolve(dataPath);
const testDir = path.dirname(fullPath);
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
  // Don't try to parse 204 No Content
  if (res.status === 204) {
    return null;
  }

  let json;
  try { json = JSON.parse(text); } catch(e) { json = { error: text }; }
  
  if (!res.ok) {
    throw new Error(`API ${method} ${endpoint} failed: ${res.status} ${text}`);
  }
  return json;
}

// Media logic
async function uploadMedia(fileRef, token, label) {
  let relativePaths = [
    fileRef,
    `Images/${fileRef}`,
    `Images/${path.basename(fileRef)}`
  ];
  
  let absolutePath = null;
  for (const rel of relativePaths) {
    const testPath = path.resolve(testDir, rel);
    if (fs.existsSync(testPath)) {
      absolutePath = testPath;
      break;
    }
  }

  if (!absolutePath) {
    console.warn(`    Warning: Media file not found for reference '${fileRef}'. (Searched in ${testDir})`);
    return null;
  }
  
  const filename = path.basename(absolutePath);
  const mimeType = mime.lookup(filename) || 'application/octet-stream';
  const type = mimeType.startsWith('image/') ? 'image' : (mimeType.startsWith('audio/') ? 'audio' : 'video');
  
  console.log(`    Uploading media: ${filename} as ${type}`);
  
  // Get presigned URL
  const initRes = await rq('POST', '/media', {
    filename,
    label: label || filename,
    type
  }, token);
  
  const { id: mediaId, presignedUrl } = initRes;
  
  // Upload to S3
  const fileBuffer = fs.readFileSync(absolutePath);
  const putRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType
    },
    body: fileBuffer
  });
  
  if (!putRes.ok) {
    throw new Error(`S3 upload failed for ${filename}: ${putRes.status}`);
  }
  
  return mediaId;
}

async function attachMediaToQuestion(qId, mediaId, token) {
  await rq('POST', `/questions/${qId}/media/${mediaId}`, null, token);
}

async function attachMediaToOption(optId, mediaId, token) {
  await rq('POST', `/options/${optId}/media/${mediaId}`, null, token);
}

async function run() {
  try {
    console.log(`Authenticating as ${adminEmail}...`);
    const authRes = await rq('POST', '/auth/login', { email: adminEmail, password: adminPassword });
    const token = authRes.access_token;

    // Use the first item if passing an array
    const testData = Array.isArray(data) ? data[0] : data;

    console.log(`Updating test ID: ${targetTestId} with title: ${testData.title}`);
    await rq('PATCH', `/tests/${targetTestId}`, {
      title: testData.title,
      description: testData.description || '',
      test_specific_info: testData.test_specific_info || { language: testData.language || 'en' },
      isActive: true,
      duration: testData.duration || undefined
    }, token);

    const testId = targetTestId;

    // Fetch existing sections and delete them
    const existingSections = await rq('GET', `/tests/${testId}/sections`, null, token);
    
    if (existingSections && Array.isArray(existingSections)) {
      console.log(`Found ${existingSections.length} existing sections. Deleting them...`);
      for (const section of existingSections) {
        console.log(`  Deleting section ID: ${section.id}`);
        await rq('DELETE', `/sections/${section.id}`, null, token);
      }
    }

    // Now recreate sections and questions
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

        // Media for question
        if (qData.imageFile) {
          const mediaId = await uploadMedia(qData.imageFile, token, `Image for ${qText.substring(0,20)}`);
          if (mediaId) await attachMediaToQuestion(qId, mediaId, token);
        }
        if (qData.config?.imageFiles && Array.isArray(qData.config.imageFiles)) {
           for (const imgFile of qData.config.imageFiles) {
             const mediaId = await uploadMedia(imgFile, token, `Image for ${qText.substring(0,20)}`);
             if (mediaId) await attachMediaToQuestion(qId, mediaId, token);
           }
        }
        if (qData.config?.imagePool && Array.isArray(qData.config.imagePool)) {
           for (const imgFile of qData.config.imagePool) {
             const mediaId = await uploadMedia(imgFile, token, `Image Pool Item`);
             if (mediaId) await attachMediaToQuestion(qId, mediaId, token);
           }
        }
        if (qData.config?.referenceImageFile) {
          const mediaId = await uploadMedia(qData.config.referenceImageFile, token, `Reference for ${qText.substring(0,20)}`);
          if (mediaId) await attachMediaToQuestion(qId, mediaId, token);
        }

        if (qData.options && Array.isArray(qData.options)) {
          for (const opt of qData.options) {
             const optRes = await rq('POST', `/questions/${qId}/options`, {
               text: opt.text || '',
               isCorrect: opt.isCorrect || false,
               weight: opt.weight || (opt.isCorrect ? 1 : 0)
             }, token);
             
             // Option Media
             if (opt.imageFile || opt.img) {
               const mediaId = await uploadMedia(opt.imageFile || opt.img, token, `Option Image`);
               if (mediaId) await attachMediaToOption(optRes.id, mediaId, token);
             }
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

    console.log('Update complete!');
  } catch(e) {
    console.error('Error:', e);
  }
}

run();
