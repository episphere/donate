const admin = require('firebase-admin');
admin.initializeApp();
const storage = admin.storage();
const bucketName = process.env.GCSBucket || 'data-donation';
const bucket = storage.bucket(bucketName);

const getTokens = async (m = 10, n = 10000) => { // get tokens or create them first
  try {
    const [files] = await bucket.getFiles();
    if (files.length === 0) {
      const userTokens = await createTokenFiles(m, n);
      return userTokens;
    }
    if (files.map(dt => dt.name).includes('userTokens.txt')) {
      const file = bucket.file('userTokens.txt');
      const userTokensFile = await readData(file);
      const userTokens = userTokensFile.split(',');
      return userTokens;
    }
    else {
      const userTokens = generateRandomStrings(n);
      await saveFile(userTokens.join(','), bucket, 'userTokens.txt');
      return userTokens;
    }
  } catch (error) {
    console.log(error)
  }
}

exports.donate = async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).json({ code: 200 });

  const token = req.query.token ? req.query.token : req.headers.authorization ? req.headers.authorization.replace('Bearer ', '').trim() : null;
  if (!token) return res.status(401).json({ message: 'Authorization failed!', code: 401 });
  const bucket = storage.bucket('donation-deleteme');
  const [files] = await bucket.getFiles();
  if (req.method === 'POST') {
    if (files.map(dt => dt.name).includes('userTokens.txt')) {
      try {
        const file = bucket.file('userTokens.txt');
        const userTokensFile = await readData(file);
        const userTokens = userTokensFile.split(',');
        if (userTokens.includes(token)) {
          const body = req.body;

          if (Object.keys(body).length === 0) return res.status(400).json({ message: 'Body is empty!', code: 400 });
          const fileName = body.fileName ? `data/${body.fileName}.json` : `data/${token}.json`
          const data = body
          if (data.fileName) delete data.fileName
          await saveFile(JSON.stringify(data), bucket, fileName);
          res.status(200).json({ message: 'Success!', code: 200 });
        }
        else return res.status(401).json({ message: 'Authorization failed!', code: 401 });
      } catch (error) {
        console.error(error.message)
        return res.status(400).json({ message: 'Bad request!', code: 400 });
      }
    }
  }

  if (req.method === 'GET') {
    if (files.map(dt => dt.name).includes('adminTokens.txt')) {
      const file = bucket.file('adminTokens.txt');
      const adminTokensFile = await readData(file);
      const adminTokens = adminTokensFile.split(',');
      if (adminTokens.includes(token)) {
        const [lists] = await bucket.getFiles({ prefix: 'data/' });
        const userFilesLists = lists.map(dt => dt.name.replace('data/', ''));
        if (req.query.fileName) {
          const fileName = req.query.fileName;
          if(!userFilesLists.includes(fileName)) return res.status(404).json({ message: 'File not found!', code: 404 });
          const file = bucket.file(`data/${fileName}`);
          const data = await readData(file);
          return res.status(200).json({ message: 'Success!', code: 200, data: JSON.parse(data) });
        }
        else return res.status(200).json({ message: 'Success!', code: 200, files: userFilesLists });
      }
      else return res.status(401).json({ message: 'Authorization failed!', code: 401 });
    }
  }
}

const readData = (file) => {
  let data = '';
  return new Promise((resolve, reject) => {
    const stream = file.createReadStream();
      stream.on('error', error => {
        reject(error);
      })
      .on('data', (d) => {
        data += d;
      })
      .on('end', () => {
        resolve(data);
      });
  });
}

const createTokenFiles = async (m, n, type) => {
  const adminTokens = generateRandomStrings(m);
  const tokens = generateRandomStrings(n);
  if (!type) {
    await saveFile(tokens.join(','), bucket, 'userTokens.txt');
    await saveFile(adminTokens.join(','), bucket, 'adminTokens.txt');
    return tokens;
  }
  else if (type && type === 'user') {
    await saveFile(tokens.join(','), bucket, 'userTokens.txt');
    return tokens;
  }
  else if (type && type === 'admin') {
    await saveFile(adminTokens.join(','), bucket, 'adminTokens.txt');
  }
}

const saveFile = async (data, bucket, fileName) => {
  const file = bucket.file(fileName);
  await file.save(data);
}

const generateRandomStrings = (size) => {
  const a = [...Array(size)].map(_ => makeTokens(1, 32));
  let unique = a.filter((item, i, ar) => ar.indexOf(item) === i);
  return unique;
}