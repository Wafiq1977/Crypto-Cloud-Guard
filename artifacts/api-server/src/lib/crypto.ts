import crypto from "crypto";

// AES-256-CBC encryption
export function encryptAES(data: Buffer, key: string): Buffer {
  const keyBuffer = crypto.scryptSync(key, "cipherdrive-salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  // Prepend IV to encrypted data
  return Buffer.concat([iv, encrypted]);
}

export function decryptAES(data: Buffer, key: string): Buffer {
  const keyBuffer = crypto.scryptSync(key, "cipherdrive-salt", 32);
  const iv = data.subarray(0, 16);
  const encrypted = data.subarray(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// RSA encryption (for small data / keys)
export function encryptRSA(data: Buffer, publicKey: string): Buffer {
  // RSA can only encrypt data up to key size minus padding overhead.
  // For 2048-bit key with OAEP padding, max is 190 bytes (SHA-256) or 214 bytes (SHA-1).
  // Use a conservative limit of 190 bytes to be safe.
  const MAX_RSA_DATA_SIZE = 190;
  if (data.length > MAX_RSA_DATA_SIZE) {
    throw new Error(`Data too large for RSA encryption. Maximum size is ${MAX_RSA_DATA_SIZE} bytes. Use HybridAES-RSA algorithm for larger data.`);
  }

  // Determine if the key is a PEM public key
  const isPemPublicKey = publicKey.includes("BEGIN PUBLIC KEY") || publicKey.includes("BEGIN RSA PUBLIC KEY");
  
  if (isPemPublicKey) {
    // Use the provided PEM public key directly
    return crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      data
    );
  } else {
    // Treat as passphrase: protect a randomly generated RSA key pair
    // Generate random RSA key pair
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pubPem = pub.export({ type: "spki", format: "pem" });
    const privPem = priv.export({ type: "pkcs8", format: "pem" });
    
    // Encrypt the data with the public key
    const encryptedData = crypto.publicEncrypt(
      { key: pubPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      data
    );
    
    // Encrypt the private key PEM using AES with a key derived from the passphrase
    const encryptedPrivKey = encryptAES(Buffer.from(privPem), publicKey); // reuse the passphrase as key
    
    // Output format: [length of encryptedPrivKey (4 bytes BE)] [encryptedPrivKey] [encryptedData]
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(encryptedPrivKey.length, 0);
    return Buffer.concat([lenBuf, encryptedPrivKey, encryptedData]);
  }
}

export function decryptRSA(data: Buffer, privateKey: string): Buffer {
  // Determine if the key is a PEM private key
  const isPemPrivateKey = privateKey.includes("BEGIN PRIVATE KEY") || privateKey.includes("BEGIN RSA PRIVATE KEY");
  
  if (isPemPrivateKey) {
    // Use the provided PEM private key directly
    return crypto.privateDecrypt(
      { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      data
    );
  } else {
    // Treat as passphrase: extract encrypted private key and encrypted data
    if (data.length < 4) {
      throw new Error("Invalid encrypted data: too short to contain length of encrypted private key");
    }
    const privKeyLen = data.readUInt32BE(0);
    if (data.length < 4 + privKeyLen) {
      throw new Error("Invalid encrypted data: too short for encrypted private key");
    }
    const encryptedPrivKeyBuf = data.slice(4, 4 + privKeyLen);
    const encryptedDataBuf = data.slice(4 + privKeyLen);
    
    // Decrypt the private key PEM using AES with the passphrase
    const decryptedPrivKeyBuf = decryptAES(encryptedPrivKeyBuf, privateKey);
    const privKeyPem = decryptedPrivKeyBuf.toString();
    
    // Decrypt the data using the RSA private key
    return crypto.privateDecrypt(
      { key: privKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      encryptedDataBuf
    );
  }
}

  // Determine if the key is a PEM public key
  const isPemPublicKey = publicKey.includes("BEGIN PUBLIC KEY") || publicKey.includes("BEGIN RSA PUBLIC KEY");
  let keyToUse: Buffer | string = publicKey;

  if (!isPemPublicKey) {
    // Treat as passphrase: generate a random key pair
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pubPem = pub.export({ type: "spki", format: "pem" });
    const privPem = priv.export({ type: "pkcs8", format: "pem" });
    keyToUse = pubPem;
    // We'll embed the private key PEM in the output
    const privBuf = Buffer.from(privPem);
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(privBuf.length, 0);
    const encrypted = crypto.publicEncrypt(
      { key: keyToUse, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      data
    );
    return Buffer.concat([lenBuf, privBuf, encrypted]);
  } else {
    // Use the provided PEM public key directly
    return crypto.publicEncrypt(
      { key: keyToUse, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      data
    );
  }
}

export function decryptRSA(data: Buffer, privateKey: string): Buffer {
  // Determine if the key is a PEM private key
  const isPemPrivateKey = privateKey.includes("BEGIN PRIVATE KEY") || privateKey.includes("BEGIN RSA PRIVATE KEY");
  let keyToUse: Buffer | string = privateKey;
  let encryptedData: Buffer = data;

  if (!isPemPrivateKey) {
    // Treat as passphrase: extract embedded private key from data
    if (data.length < 4) {
      throw new Error("Invalid encrypted data: too short to contain private key length");
    }
    const privLen = data.readUInt32BE(0);
    if (data.length < 4 + privLen) {
      throw new Error("Invalid encrypted data: too short for embedded private key");
    }
    const privKeyBuf = data.slice(4, 4 + privLen);
    encryptedData = data.slice(4 + privLen);
    keyToUse = privKeyBuf.toString(); // PEM string
  }
  // else: use the provided PEM private key directly, encryptedData is the whole data

  return crypto.privateDecrypt(
    { key: keyToUse, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    encryptedData
  );
}
  
  // Handle both PEM format strings and potential passphrases
  let keyToUse = publicKey;
  
  // If the key doesn't look like a PEM public key, treat it as a passphrase
  // and generate/get a deterministic key pair from it
  if (!publicKey.includes("BEGIN PUBLIC KEY") && !publicKey.includes("BEGIN RSA PUBLIC KEY")) {
    const passphraseHash = crypto.createHash('sha256').update(publicKey).digest('hex');
    
    // Get or generate key pair for this passphrase
    if (!rsaKeyCache.has(passphraseHash)) {
      const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
      rsaKeyCache.set(passphraseHash, {
        publicKey: pub.export({ type: "spki", format: "pem" }).toString(),
        privateKey: priv.export({ type: "pkcs8", format: "pem" }).toString()
      });
    }
    
    keyToUse = rsaKeyCache.get(passphraseHash)!.publicKey;
  }
  
  return crypto.publicEncrypt(
    { key: keyToUse, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    data
  );
}

export function decryptRSA(data: Buffer, privateKey: string): Buffer {
  // Handle both PEM format strings and potential passphrases
  let keyToUse = privateKey;
  
  // If the key doesn't look like a PEM private key, treat it as a passphrase
  // and get the deterministic key pair from it
  if (!privateKey.includes("BEGIN PRIVATE KEY") && !privateKey.includes("BEGIN RSA PRIVATE KEY")) {
    const passphraseHash = crypto.createHash('sha256').update(privateKey).digest('hex');
    const keyPair = rsaKeyCache.get(passphraseHash);
    
    if (!keyPair) {
      throw new Error("No encryption record found for this passphrase. Please encrypt first.");
    }
    
    keyToUse = keyPair.privateKey;
  }
  
  return crypto.privateDecrypt({ key: keyToUse, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, data);


// Caesar Cipher (text-based, shift = key as number)
export function encryptCaesar(data: Buffer, key: string): Buffer {
  const shift = (parseInt(key, 10) || key.charCodeAt(0)) % 256;
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = (data[i] + shift) % 256;
  }
  return result;
}

export function decryptCaesar(data: Buffer, key: string): Buffer {
  const shift = (parseInt(key, 10) || key.charCodeAt(0)) % 256;
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = (data[i] - shift + 256) % 256;
  }
  return result;
}

// Vigenere Cipher (key as string)
export function encryptVigenere(data: Buffer, key: string): Buffer {
  const keyBytes = Buffer.from(key);
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = (data[i] + keyBytes[i % keyBytes.length]) % 256;
  }
  return result;
}

export function decryptVigenere(data: Buffer, key: string): Buffer {
  const keyBytes = Buffer.from(key);
  const result = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = (data[i] - keyBytes[i % keyBytes.length] + 256) % 256;
  }
  return result;
}

// Rail Fence Cipher
export function encryptRailFence(data: Buffer, key: string): Buffer {
  const rails = Math.max(2, parseInt(key, 10) || 3);
  const text = data.toString("binary");
  const fence: string[][] = Array.from({ length: rails }, () => []);
  let rail = 0;
  let dir = 1;
  for (const ch of text) {
    fence[rail].push(ch);
    if (rail === 0) dir = 1;
    else if (rail === rails - 1) dir = -1;
    rail += dir;
  }
  return Buffer.from(fence.map((r) => r.join("")).join(""), "binary");
}

export function decryptRailFence(data: Buffer, key: string): Buffer {
  const rails = Math.max(2, parseInt(key, 10) || 3);
  const text = data.toString("binary");
  const n = text.length;
  const pattern: number[] = new Array(n);
  let rail = 0;
  let dir = 1;
  for (let i = 0; i < n; i++) {
    pattern[i] = rail;
    if (rail === 0) dir = 1;
    else if (rail === rails - 1) dir = -1;
    rail += dir;
  }
  const counts = new Array(rails).fill(0);
  for (const r of pattern) counts[r]++;
  const railStrs: string[] = [];
  let pos = 0;
  for (let r = 0; r < rails; r++) {
    railStrs.push(text.slice(pos, pos + counts[r]));
    pos += counts[r];
  }
  const railIdx = new Array(rails).fill(0);
  let result = "";
  for (const r of pattern) {
    result += railStrs[r][railIdx[r]++];
  }
  return Buffer.from(result, "binary");
}

// SHA-256 Hash (one-way)
export function hashSHA256(data: Buffer): Buffer {
  return Buffer.from(crypto.createHash("sha256").update(data).digest("hex"), "utf-8");
}

// Hybrid AES+RSA
export function encryptHybrid(data: Buffer, key: string): Buffer {
  // Generate a random AES key, encrypt the data with AES, then "encrypt" the AES key with key-derived bytes
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
  const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
  // XOR the AES key with a key-derived value
  const keyDerived = crypto.scryptSync(key, "hybrid-salt", 32);
  const encryptedAesKey = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) encryptedAesKey[i] = aesKey[i] ^ keyDerived[i];
  // Format: [encryptedAesKey(32)] [iv(16)] [encryptedData]
  return Buffer.concat([encryptedAesKey, iv, encryptedData]);
}

export function decryptHybrid(data: Buffer, key: string): Buffer {
  const encryptedAesKey = data.subarray(0, 32);
  const iv = data.subarray(32, 48);
  const encryptedData = data.subarray(48);
  const keyDerived = crypto.scryptSync(key, "hybrid-salt", 32);
  const aesKey = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) aesKey[i] = encryptedAesKey[i] ^ keyDerived[i];
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

// Dispatch encrypt/decrypt by algorithm
export function encryptBuffer(
  data: Buffer,
  algorithm: string,
  key: string
): { encrypted: Buffer; isSha: boolean } {
  switch (algorithm) {
    case "AES-256":
      return { encrypted: encryptAES(data, key), isSha: false };
    case "RSA":
      return { encrypted: encryptRSA(data, key), isSha: false };
    case "Caesar":
      return { encrypted: encryptCaesar(data, key), isSha: false };
    case "Vigenere":
      return { encrypted: encryptVigenere(data, key), isSha: false };
    case "RailFence":
      return { encrypted: encryptRailFence(data, key), isSha: false };
    case "SHA256":
      return { encrypted: hashSHA256(data), isSha: true };
    case "HybridAES-RSA":
      return { encrypted: encryptHybrid(data, key), isSha: false };
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}

export function decryptBuffer(data: Buffer, algorithm: string, key: string): Buffer {
  switch (algorithm) {
    case "AES-256":
      return decryptAES(data, key);
    case "RSA":
      return decryptRSA(data, key);
    case "Caesar":
      return decryptCaesar(data, key);
    case "Vigenere":
      return decryptVigenere(data, key);
    case "RailFence":
      return decryptRailFence(data, key);
    case "SHA256":
      throw new Error("SHA-256 is a one-way hash and cannot be decrypted");
    case "HybridAES-RSA":
      return decryptHybrid(data, key);
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}
