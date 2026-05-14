import api from './api';

const ADNI_COLUMNS = [
  "RID","COLPROT","ORIGPROT","PTID","SITE","VISCODE","EXAMDATE","DX_bl","AGE","PTGENDER",
  "PTEDUCAT","PTETHCAT","PTRACCAT","PTMARRY","APOE4","FDG","PIB","AV45","FBB","ABETA",
  "TAU","PTAU","CDRSB","ADAS11","ADAS13","ADASQ4","MMSE","RAVLT_immediate","RAVLT_learning",
  "RAVLT_forgetting","RAVLT_perc_forgetting","LDELTOTAL","DIGITSCOR","TRABSCOR","FAQ","MOCA",
  "EcogPtMem","EcogPtLang","EcogPtVisspat","EcogPtPlan","EcogPtOrgan","EcogPtDivatt","EcogPtTotal",
  "EcogSPMem","EcogSPLang","EcogSPVisspat","EcogSPPlan","EcogSPOrgan","EcogSPDivatt","EcogSPTotal",
  "FLDSTRENG","FSVERSION","IMAGEUID","Ventricles","Hippocampus","WholeBrain","Entorhinal","Fusiform",
  "MidTemp","ICV","DX","mPACCdigit","mPACCtrailsB","EXAMDATE_bl","CDRSB_bl","ADAS11_bl","ADAS13_bl",
  "ADASQ4_bl","MMSE_bl","RAVLT_immediate_bl","RAVLT_learning_bl","RAVLT_forgetting_bl",
  "RAVLT_perc_forgetting_bl","LDELTOTAL_BL","DIGITSCOR_bl","TRABSCOR_bl","FAQ_bl","mPACCdigit_bl",
  "mPACCtrailsB_bl","FLDSTRENG_bl","FSVERSION_bl","IMAGEUID_bl","Ventricles_bl","Hippocampus_bl",
  "WholeBrain_bl","Entorhinal_bl","Fusiform_bl","MidTemp_bl","ICV_bl","MOCA_bl","EcogPtMem_bl",
  "EcogPtLang_bl","EcogPtVisspat_bl","EcogPtPlan_bl","EcogPtOrgan_bl","EcogPtDivatt_bl","EcogPtTotal_bl",
  "EcogSPMem_bl","EcogSPLang_bl","EcogSPVisspat_bl","EcogSPPlan_bl","EcogSPOrgan_bl","EcogSPDivatt_bl",
  "EcogSPTotal_bl","ABETA_bl","TAU_bl","PTAU_bl","FDG_bl","PIB_bl","AV45_bl","FBB_bl","Years_bl",
  "Month_bl","Month","M","update_stamp"
];

const fetchAll = async (endpoint) => {
  let allItems = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const res = await api.get(`${endpoint}?limit=${limit}&offset=${offset}`);
    const items = res.data.items || [];
    allItems = [...allItems, ...items];
    if (items.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }
  return allItems;
};

export const fetchAllAdniData = async () => {
  const users = await fetchAll('/users');
  const attempts = await fetchAll('/attempts');

  const attemptsByUserId = attempts.reduce((acc, attempt) => {
    if (!acc[attempt.userId]) acc[attempt.userId] = [];
    acc[attempt.userId].push(attempt);
    return acc;
  }, {});

  for (const userId in attemptsByUserId) {
    attemptsByUserId[userId].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  }

  return { users, attemptsByUserId };
};

const getViscode = (index) => {
  if (index === 0) return 'bl';
  return `m${(index * 6).toString().padStart(2, '0')}`;
};

const mapUserAndAttemptToADNI = (user, attempt, index) => {
  const userInfo = user.user_specific_info || {};
  const examDate = attempt ? new Date(attempt.startedAt).toISOString().split('T')[0] : "";
  const updateStamp = new Date().toISOString();

  // Start with all columns empty
  const row = ADNI_COLUMNS.reduce((acc, col) => {
    acc[col] = "";
    return acc;
  }, {});

  row.RID = user.id;
  row.PTID = user.email || user.name;
  row.VISCODE = attempt ? getViscode(index) : "";
  row.EXAMDATE = examDate;
  row.update_stamp = updateStamp;
  
  // Fill user specific demographics if they map to ADNI fields
  row.AGE = userInfo.AGE || userInfo.age || "";
  row.PTGENDER = userInfo.PTGENDER || userInfo.gender || "";
  row.PTEDUCAT = userInfo.PTEDUCAT || userInfo.education || "";
  row.PTETHCAT = userInfo.PTETHCAT || userInfo.ethnicity || "";
  row.PTRACCAT = userInfo.PTRACCAT || userInfo.race || "";
  row.PTMARRY = userInfo.PTMARRY || userInfo.marital_status || "";
  row.APOE4 = userInfo.APOE4 || "";

  // If there's an attempt, map scores (e.g. MMSE, MOCA, etc.) from attempt data if available
  // E.g. we might have specific scores in attempt or just a totalScore.
  // For now, only map what we explicitly have.
  
  return row;
};

export const generateAdniCsv = async () => {
  const { users, attemptsByUserId } = await fetchAllAdniData();
  const rows = [];

  users.forEach(user => {
    const userAttempts = attemptsByUserId[user.id] || [];
    // Only include users who have at least one test attempt
    if (userAttempts.length > 0) {
      userAttempts.forEach((attempt, index) => {
        rows.push(mapUserAndAttemptToADNI(user, attempt, index));
      });
    }
  });

  const csvContent = [
    ADNI_COLUMNS.join(','),
    ...rows.map(row => 
      ADNI_COLUMNS.map(col => `"${(row[col] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'ADNI_Merge_Export.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
